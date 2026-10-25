#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Burak Yildiz"; git config user.email "burak@kaleportal.example"
git config commit.gpgsign false
ci() {
  local n e
  case "$1" in
    b) n="Burak Yildiz"; e="burak@kaleportal.example";;
    m) n="Mert Kaya"; e="mert@kaleportal.example";;
    s) n="Selin Aksoy"; e="selin@kaleportal.example";;
  esac
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" \
  GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}
sub() { python3 - "$1" "$2" "$3" <<'PY'
import sys
f,o,n=sys.argv[1:4]
s=open(f).read()
assert o in s,(f,o)
open(f,'w').write(s.replace(o,n,1))
PY
}
mkdir -p satis_rapor tests config deploy docs data

cat > README.md <<'EOF'
# satis-rapor

Aylik satis raporunu CSV dosyalarindan uretir ve finans ekibine e-posta ile gonderir.

    python3 -m satis_rapor.main --ay onceki
    python3 -m satis_rapor.main --ay 2026-09

Kurulum icin docs/KURULUM.md dosyasina bakin.
EOF
printf '__pycache__/\n*.pyc\ncikti/\n' > .gitignore
printf '# Bagimlilik yok, sadece standart kutuphane.\n' > requirements.txt
cat > Makefile <<'EOF'
test:
	python3 -m unittest discover -s tests
EOF
ci b "2026-03-02T09:00:00+0300" "ilk commit: README, Makefile"

touch satis_rapor/__init__.py
cat > satis_rapor/loader.py <<'EOF'
import csv
from decimal import Decimal


def yukle(dosya):
    """Satis satirlarini okur: tarih, urun, adet, birim_fiyat."""
    satirlar = []
    with open(dosya, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            satirlar.append({
                "tarih": r["tarih"],
                "urun": r["urun"],
                "adet": int(r["adet"]),
                "birim_fiyat": Decimal(r["birim_fiyat"]),
            })
    return satirlar
EOF
cat > data/ornek_satis.csv <<'EOF'
tarih,urun,adet,birim_fiyat
2026-09-01,Kilim,2,1250.00
2026-09-03,Yastik,10,89.90
2026-09-12,Kilim,1,1250.00
2026-09-20,Sal,3,267.50
EOF
cat > tests/test_loader.py <<'EOF'
import unittest
from satis_rapor.loader import yukle


class LoaderTest(unittest.TestCase):
    def test_satir_sayisi(self):
        self.assertEqual(len(yukle("data/ornek_satis.csv")), 4)


if __name__ == "__main__":
    unittest.main()
EOF
ci b "2026-03-03T11:00:00+0300" "loader: CSV okuma"

cat > satis_rapor/kdv.py <<'EOF'
def hesapla(tutar, oran):
    """KDV tutarini kurusa yuvarlayarak dondurur. tutar: float, oran: yuzde."""
    return round(tutar * oran / 100, 2)
EOF
cat > tests/test_kdv.py <<'EOF'
import unittest
from satis_rapor.kdv import hesapla


class KdvTest(unittest.TestCase):
    def test_basit(self):
        self.assertEqual(hesapla(100.0, 20), 20.0)

    def test_kurus(self):
        self.assertEqual(hesapla(10.05, 18), 1.81)


if __name__ == "__main__":
    unittest.main()
EOF
ci m "2026-03-05T14:00:00+0300" "kdv hesaplama"

cat > satis_rapor/report.py <<'EOF'
import csv
import os

from .kdv import hesapla


def uret(satirlar, kdv_orani, ay, cikti_dizin="cikti"):
    os.makedirs(cikti_dizin, exist_ok=True)
    yol = os.path.join(cikti_dizin, "satis_%s.csv" % ay)
    toplam = 0.0
    toplam_kdv = 0.0
    with open(yol, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["urun", "adet", "tutar", "kdv", "toplam"])
        for s in satirlar:
            tutar = float(s["adet"] * s["birim_fiyat"])
            kdv = hesapla(tutar, kdv_orani)
            toplam += tutar
            toplam_kdv += kdv
            w.writerow([s["urun"], s["adet"], "%.2f" % tutar, "%.2f" % kdv, "%.2f" % (tutar + kdv)])
        w.writerow(["TOPLAM", "", "%.2f" % toplam, "%.2f" % toplam_kdv, "%.2f" % (toplam + toplam_kdv)])
    return yol
EOF
cat > tests/test_report.py <<'EOF'
import os
import tempfile
import unittest
from satis_rapor.loader import yukle
from satis_rapor.report import uret


class ReportTest(unittest.TestCase):
    def test_dosya_uretilir(self):
        with tempfile.TemporaryDirectory() as d:
            yol = uret(yukle("data/ornek_satis.csv"), 20, "2026-09", d)
            self.assertTrue(os.path.exists(yol))
            self.assertIn("TOPLAM", open(yol, encoding="utf-8").read())


if __name__ == "__main__":
    unittest.main()
EOF
ci b "2026-03-09T10:00:00+0300" "rapor uretimi"

cat > config/report.ini <<'EOF'
[rapor]
kdv_orani = 20
veri_dizini = /srv/satis/veri

[mail]
send_email = true
smtp_host = smtp.kaleportal.example
smtp_port = 587
kullanici = rapor@kaleportal.example
alicilar = finans@kaleportal.example
EOF
cat > satis_rapor/config.py <<'EOF'
import configparser


def oku(yol="config/report.ini"):
    c = configparser.ConfigParser()
    c.read(yol, encoding="utf-8")
    return c
EOF
ci b "2026-03-10T09:30:00+0300" "config/report.ini ve okuyucu"

cat > satis_rapor/mailer.py <<'EOF'
import os
import smtplib
from email.message import EmailMessage


def gonder(cfg, ek_yolu, ay):
    if cfg["mail"].getboolean("send_email") is not True:
        print("e-posta kapali (send_email=false), gonderilmedi")
        return False
    parola = os.environ.get("RAPOR_SMTP_PAROLA")
    if not parola:
        raise RuntimeError("RAPOR_SMTP_PAROLA ortam degiskeni tanimli degil")
    m = EmailMessage()
    m["Subject"] = "Aylik satis raporu " + ay
    m["From"] = cfg["mail"]["kullanici"]
    m["To"] = cfg["mail"]["alicilar"]
    m.set_content("Ekte " + ay + " donemi satis raporu var.")
    with open(ek_yolu, "rb") as f:
        m.add_attachment(f.read(), maintype="text", subtype="csv", filename=os.path.basename(ek_yolu))
    with smtplib.SMTP(cfg["mail"]["smtp_host"], cfg["mail"].getint("smtp_port")) as s:
        s.starttls()
        s.login(cfg["mail"]["kullanici"], parola)
        s.send_message(m)
    return True
EOF
ci m "2026-03-16T16:00:00+0300" "mailer: raporu e-posta ile gonder"

cat > satis_rapor/main.py <<'EOF'
import argparse
import datetime
import os

from . import config, loader, mailer, report


def onceki_ay(bugun=None):
    bugun = bugun or datetime.date.today()
    ilk = bugun.replace(day=1)
    son_gun = ilk - datetime.timedelta(days=1)
    return son_gun.strftime("%Y-%m")


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--ay", default="onceki", help="YYYY-AA ya da 'onceki'")
    a = p.parse_args(argv)
    ay = onceki_ay() if a.ay == "onceki" else a.ay
    cfg = config.oku()
    dosya = os.path.join(cfg["rapor"]["veri_dizini"], "satis_%s.csv" % ay)
    satirlar = loader.yukle(dosya)
    yol = report.uret(satirlar, float(cfg["rapor"]["kdv_orani"]), ay)
    print("rapor uretildi:", yol)
    mailer.gonder(cfg, yol, ay)


if __name__ == "__main__":
    main()
EOF
cat >> tests/test_report.py <<'EOF'
EOF
cat > tests/test_main.py <<'EOF'
import datetime
import unittest
from satis_rapor.main import onceki_ay


class MainTest(unittest.TestCase):
    def test_onceki_ay(self):
        self.assertEqual(onceki_ay(datetime.date(2026, 1, 1)), "2025-12")
        self.assertEqual(onceki_ay(datetime.date(2026, 10, 1)), "2026-09")


if __name__ == "__main__":
    unittest.main()
EOF
ci b "2026-03-17T10:00:00+0300" "main: komut satiri, --ay onceki"

cat > deploy/crontab.txt <<'EOF'
# satis-rapor: her ayin 1'i saat 06:00
0 6 1 * * cd /opt/satis-rapor && /usr/bin/python3 -m satis_rapor.main --ay onceki >> /var/log/satis-rapor.log 2>&1
EOF
cat > docs/KURULUM.md <<'EOF'
# Kurulum

1. Sunucuda `/opt/satis-rapor` altina klonlayin.
2. `config/report.ini` dosyasini kontrol edin.
3. `deploy/crontab.txt` icerigini `crontab -e` ile ekleyin.

Rapor her ayin 1'inde otomatik uretilir ve e-posta ile finans ekibine gonderilir.
Parola `RAPOR_SMTP_PAROLA` ortam degiskeninden okunur.
EOF
ci b "2026-03-20T09:00:00+0300" "deploy: crontab ve kurulum notlari"
git tag -a v1.0.0 -m "ilk uretim surumu"

cat > CHANGELOG.md <<'EOF'
# Degisiklikler

## 1.0.0 - 2026-03-20
- Aylik satis raporu, KDV hesabi, e-posta gonderimi.
EOF
ci b "2026-03-23T09:00:00+0300" "CHANGELOG"

# --- surum sonrasi ---
cat > docs/SORUNLAR.md <<'EOF'
# Bilinen sorunlar

- Veri dosyasi eksikse program hata verip durur; cron logunda gorunur.
EOF
ci b "2026-05-04T10:00:00+0300" "docs: bilinen sorunlar"

sub satis_rapor/main.py 'p.add_argument("--ay"' 'p.add_argument("--kuru-calisma", action="store_true", help="e-posta gonderme")
    p.add_argument("--ay"'
sub satis_rapor/main.py '    mailer.gonder(cfg, yol, ay)' '    if not a.kuru_calisma:
        mailer.gonder(cfg, yol, ay)'
ci s "2026-06-02T11:00:00+0300" "main: --kuru-calisma secenegi"

python3 - <<'PY'
s=open('tests/test_kdv.py').read()
s=s.replace('''

if __name__''','''
    @unittest.skip("yarim kurus yuvarlamasi: fix/kdv-yuvarlama dalinda duzeltiliyor")
    def test_kdv_yarim_kurus(self):
        # 267.50 TL uzerinden %1 KDV = 2.675 -> 2.68 olmali
        self.assertEqual(hesapla(267.5, 1), 2.68)


if __name__''')
open('tests/test_kdv.py','w').write(s)
PY
ci m "2026-06-18T15:30:00+0300" "test: yarim kurus KDV testi (simdilik atlandi)"

cat > docs/SMTP.md <<'EOF'
# SMTP

Gonderim `smtp.kaleportal.example:587` uzerinden STARTTLS ile yapilir.
Hesap: rapor@kaleportal.example. Parola depoda tutulmaz.
EOF
ci b "2026-07-06T09:00:00+0300" "docs: SMTP notlari"

# kdv duzeltme dali (merge edilmedi)
git checkout -q -b fix/kdv-yuvarlama
cat > satis_rapor/kdv.py <<'EOF'
from decimal import ROUND_HALF_UP, Decimal


def hesapla(tutar, oran):
    """KDV tutarini kurusa (yarim kurus yukari) yuvarlayarak dondurur."""
    t = Decimal(str(tutar)) * Decimal(str(oran)) / Decimal(100)
    return float(t.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
EOF
python3 - <<'PY'
s=open('tests/test_kdv.py').read()
s=s.replace('''    @unittest.skip("yarim kurus yuvarlamasi: fix/kdv-yuvarlama dalinda duzeltiliyor")\n''','')
open('tests/test_kdv.py','w').write(s)
PY
ci m "2026-07-14T10:00:00+0300" "kdv: Decimal ile yarim kurus yukari yuvarla"
printf '\n- KDV yuvarlamasi: yarim kurus yukari (Decimal).\n' >> CHANGELOG.md
ci m "2026-07-15T09:00:00+0300" "changelog: kdv yuvarlama (inceleme bekliyor)"
git checkout -q main

# yeni SMTP sunucusu denemesi sirasinda yapilan "temizlik"
python3 - <<'PY'
s=open('config/report.ini').read()
s=s.replace('send_email = true','send_email = false')
s=s.replace('[mail]\n','[mail]\n# eski SMTP bilgileri kaldirildi\n')
open('config/report.ini','w').write(s)
PY
ci m "2026-08-11T17:00:00+0300" "chore: config temizligi"
printf '\nSon uretim sunucusu: rapor01 (Ankara ofisi).\n' >> docs/KURULUM.md
ci b "2026-08-12T09:30:00+0300" "docs: sunucu adi"

cat > satis_rapor/log.py <<'EOF'
import sys


def bilgi(mesaj):
    print("[bilgi]", mesaj, file=sys.stderr)
EOF
ci s "2026-08-25T10:00:00+0300" "log yardimcisi"
sub README.md 'Kurulum icin' 'Testler: `make test`.

Kurulum icin'
ci s "2026-09-01T09:00:00+0300" "README: test komutu"
sub satis_rapor/log.py 'print("[bilgi]", mesaj' 'print("[bilgi]", mesaj'
printf '\n# kullanilmiyor henuz\n' >> satis_rapor/log.py
ci s "2026-09-02T10:00:00+0300" "log: not"
sub deploy/crontab.txt '>> /var/log/satis-rapor.log 2>&1' '>> /var/log/satis-rapor.log 2>&1
# not: dizin tasinirsa yolu guncelleyin'
ci b "2026-09-14T12:00:00+0300" "crontab: not eklendi"
