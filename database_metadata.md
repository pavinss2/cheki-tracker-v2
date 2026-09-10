# Cheki Tracker Database Metadata

This file acts as a local store for the metadata and reference tables from the Google Sheet.

---

## 1. dim_member (Members Dimension)

| member_name | member_image | color | group | country | company | start_date | end_date | is_active |
|-------------|--------------|-------|-------|---------|---------|------------|----------|-----------|
| Chihiro | [Link](https://scontent.cdninstagram.com/v/t51.82787-19/657689893_18577382176063960_3432144713758140795_n.jpg?_nc_cat=103&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=TGFBdQOY_DwQ7kNvwEgMc5W&_nc_oc=Adr_rGXUXkCodBsbOniPMfHsinvzwIDJx1zXzB09V-4VqVfk3ipe2AXYakO79uRBfWc&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=MmAmQtgtRPaGpwMbf6eMhw&_nc_ss=7b6a8&oh=00_Af5p68r_SE3j2t1V6mfS-2LE1mAe5qrwVXIUUPbniFdEOg&oe=6A1A6084) | White | Eclipse | 🇹🇼 TW | Individual | 1001-01-01 | 2026-02-28 | FALSE |
| Inori | [Link](https://scontent.cdninstagram.com/v/t51.82787-19/658849412_17945435430138999_5293159283492930637_n.jpg?_nc_cat=106&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=7eApTUieB60Q7kNvwE1tCMD&_nc_oc=AdpiTuMoqADhvLzVNMCtTxxyDkDK1uqUZvf8RtQBZ6EtvLJxK6aVv8oLvrcq3FLKdWk&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=Pum5eZ3Jf2q1gx224RCFeQ&_nc_ss=7b6a8&oh=00_Af7QWP7-mxKsUuE7pBTHtrJonEiHAc5L5CKC0oltkY1c2A&oe=6A1A3A9C) | Red | Meikai | 🇹🇼 TW | Individual | 1001-01-01 | 2026-02-28 | FALSE |
| Yiwha | [Link](https://pbs.twimg.com/profile_images/2051296375720349696/aMBjRPet_400x400.jpg) | Black | Sora Sora | 🇹🇭 TH | Catsolute | 1001-01-01 | 2026-01-10 | FALSE |
| Ame | [Link](https://pbs.twimg.com/profile_images/2039387512876199936/AbUKQ7DR_400x400.jpg) | Red | Sora Sora | 🇹🇭 TH | Catsolute | 1001-01-01 | 9999-12-31 | TRUE |
| Amu | [Link](https://pbs.twimg.com/profile_images/2033533645294907392/78nua2lp_400x400.jpg) | Red | KISEO | 🇰🇷 KR | Individual | 1001-01-01 | 9999-12-31 | TRUE |
| Azu | [Link](https://pbs.twimg.com/profile_images/2055574181736235008/BhkOwWK5_400x400.jpg) | White | XINXIN | 🇯🇵 JP | Individual | 1001-01-01 | 9999-12-31 | TRUE |
| Cherri | *None* | Pink | NeoBooster | 🇨🇳 CN | Individual | 1001-01-01 | 9999-12-31 | TRUE |
| Chihiro | [Link](https://scontent.cdninstagram.com/v/t51.82787-19/657689893_18577382176063960_3432144713758140795_n.jpg?_nc_cat=103&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=TGFBdQOY_DwQ7kNvwEgMc5W&_nc_oc=Adr_rGXUXkCodBsbOniPMfHsinvzwIDJx1zXzB09V-4VqVfk3ipe2AXYakO79uRBfWc&_nc_zt=24&_nc_ht=scontent.cdninstagram.com&_nc_gid=MmAmQtgtRPaGpwMbf6eMhw&_nc_ss=7b6a8&oh=00_Af5p68r_SE3j2t1V6mfS-2LE1mAe5qrwVXIUUPbniFdEOg&oe=6A1A6084) | Blue | Genpa SYNC | 🇹🇼 TW | SSR | 2026-03-01 | 9999-12-31 | TRUE |

---

## 2. dim_company (Companies Dimension)

| company |
|---------|
| Individual |
| Catsolute |
| SSR |
| Atelier |
| Sooso Ent |
| A lot of Tone |
| EDEN |
| GenAI |
| IC45 |

---

## 3. dim_group (Groups Dimension)

| group | country | company |
|-------|---------|---------|
| Angevil | 🇹🇭 TH | A lot of Tone |
| Castella | 🇹🇭 TH | A lot of Tone |
| Kagereru | 🇰🇷 KR | Atelier |
| MEMORIA | 🇰🇷 KR | Atelier |
| Sora Sora | 🇹🇭 TH | Catsolute |
| Mirai Mirai | 🇹🇭 TH | Catsolute |
| Yami Yami | 🇹🇭 TH | Catsolute |
| Dream:0n | 🇹🇭 TH | Catsolute |
| Nox:0ff | 🇹🇭 TH | Catsolute |
| H7KD | 🇰🇷 KR | EDEN |
| NO LiMIT | 🇰🇷 KR | EDEN |
| TGG | 🇹🇭 TH | IC45 |
| Nekiru | 🇰🇷 KR | Sooso Ent |
| KOKOIYA | 🇰🇷 KR | Sooso Ent |
| Fructose | 🇹🇼 TW | SSR |
| Genpa SYNC | 🇹🇼 TW | SSR |
| Eclipse | 🇹🇼 TW | Individual |
| Meikai | 🇹🇼 TW | Individual |
| THERAREZ | 🇹🇼 TW | Individual |
| Neko Pon | 🇹🇭 TH | GenAI |
| Silver Lining | 🇹🇭 TH | Individual |
| KISEO | 🇰🇷 KR | Individual |
| Mewro | 🇰🇷 KR | Individual |
| N/A | 🇯🇵 JP | Individual |
| NeoBooster | 🇨🇳 CN | Individual |
| ReaLume | 🇨🇳 CN | Individual |
| AZ-ON | 🇹🇭 TH | Individual |
| Jinks | 🇯🇵 JP | Individual |
| XINXIN | 🇯🇵 JP | Individual |
| Solanin | 🇰🇷 KR | Individual |
| 22% | 🇰🇷 KR | Individual |
| i>3 | 🇹🇼 TW | Individual |

---

## 4. dim_color (Colors Dimension)

| color | color_code |
|-------|------------|
| Green | #27ae60 |
| Red | #e74c3c |
| Pink | #ff69b4 |
| White | #ffffff |
| Blue | #3498db |
| Yellow | #f1c40f |
| N/A | #7f8c8d |
| Purple | #9b59b6 |
| Orange | #e67e22 |
| Black | #555555 |

---

## 5. dim_type (Types Dimension)

| Type |
|------|
| Cheki |
| Order Cheki |
| Deco Cheki |
| Shame |
| Free Shame |
| Free Cheki |

---

## 6. dim_country (Countries Dimension)

| country | displayed_country |
|---------|-------------------|
| Thailand | 🇹🇭 TH |
| Korea | 🇰🇷 KR |
| Japan | 🇯🇵 JP |
| China | 🇨🇳 CN |
| Taiwan | 🇹🇼 TW |

---

## 7. fact_cheki_transaction (Sample Transactions / Raw Data)

| Member | Color | Group | Nationality | Date | Month | Year | Event | Description | Type | Location | Quantity | Total Price (THB) | IMG | Talk Topic | Member Image | Company |
|--------|-------|-------|-------------|------|-------|------|-------|-------------|------|----------|----------|-------------------|-----|------------|--------------|---------|
| Pixels | Green | Mirai Mirai | 🇹🇭 TH | 2026-06-14 | 2026-06 | 2026 | Minmin & Jennie Seitan-sai 2026 | | Cheki | Bangkok | 1 | 300 | | | | Catsolute |
| Pin | Green | Sora Sora | 🇹🇭 TH | 2026-06-14 | 2026-06 | 2026 | Minmin & Jennie Seitan-sai 2026 | | Cheki | Bangkok | 1 | 300 | | | | Catsolute |
| Bowie | Yellow | Nox:0ff | 🇹🇭 TH | 2026-06-14 | 2026-06 | 2026 | Minmin & Jennie Seitan-sai 2026 | | Cheki | Bangkok | 1 | 300 | | | | Catsolute |
| Yiwha | White | Nox:0ff | 🇹🇭 TH | 2026-06-14 | 2026-06 | 2026 | Minmin & Jennie Seitan-sai 2026 | | Cheki | Bangkok | 1 | 300 | | | | Catsolute |
| Bowie | Yellow | Nox:0ff | 🇹🇭 TH | 2026-06-13 | 2026-06 | 2026 | Nox.Exe | เข้าครั้งแรก | Cheki | Bangkok | 1 | 300 | [Link](https://photos.fife.usercontent.google.com/pw/AP1GczMDPt1H24mEkrHjqZ0OjRcSldVN9y76peqD97u_9BqIpOyiIliMZunSRtkGk04eZP9EvonPZnnYygIRD0YBhUVh30LE3g=w1221-h1737-s-no-gm?authuser=0) | | | Catsolute |
| Yiwha | White | Nox:0ff | 🇹🇭 TH | 2026-06-13 | 2026-06 | 2026 | Nox.Exe | | Cheki | Bangkok | 2 | 600 | [Link](https://photos.fife.usercontent.google.com/pw/AP1GczNnAWn1YW_TEiwlQEdrZusASZiurPNoDWd7RnPICfPOxfKIcZ_QD6H9jmPC3OUfe84csNA3mXEGzfh2CTSvAB0NSMf6sQ=w1221-h1959-s-no-gm?authuser=0) | | | Catsolute |
| Pin | Green | Sora Sora | 🇹🇭 TH | 2026-06-13 | 2026-06 | 2026 | Nox.Exe | | Cheki | Bangkok | 1 | 300 | [Link](https://photos.fife.usercontent.google.com/pw/AP1GczMVxNppzqCOJOYT5yYLEtsjssVYTLmDYiHEXHFxyKoveX9F5kIYwX_suSxdHZGpWjo217gXaGDNzq1XiKXfYCxgjxT6IA=w1221-h1863-s-no-gm?authuser=0) | | | Catsolute |
| Haru | Red | Yami Yami | 🇹🇭 TH | 2026-06-07 | 2026-06 | 2026 | Catsonic Vol.12 Maid My Day | เข้าครั้งแรก | Cheki | Bangkok | 1 | 300 | [Link](https://photos.fife.usercontent.google.com/pw/AP1GczMvVh--nSFMSA3pg9IRiwuPQbzlx_kskT40RBM-5AwaB_Ju2r0SW66F1YGaeLv57-UJ6-Onaw4e3PtHSX1UMnfwkIqEHA=w1056-h1512-s-no-gm?authuser=0) | ฮารุทำเสียงเมด | | Catsolute |
| Tonliw | Green | Yami Yami | 🇹🇭 TH | 2026-06-07 | 2026-06 | 2026 | Catsonic Vol.12 Maid My Day | เข้าครั้งแรก | Cheki | Bangkok | 1 | 300 | [Link](https://photos.fife.usercontent.google.com/pw/AP1GczMvVh--nSFMSA3pg9IRiwuPQbzlx_kskT40RBM-5AwaB_Ju2r0SW66F1YGaeLv57-UJ6-Onaw4e3PtHSX1UMnfwkIqEHA=w1056-h1512-s-no-gm?authuser=0) | ต้นหลิวทำเสียงเมด | | Catsolute |
