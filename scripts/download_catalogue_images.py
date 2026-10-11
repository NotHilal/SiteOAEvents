import sqlite3
import urllib.request
import urllib.parse
import re
import json
import os
import shutil
import subprocess
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'catalogue_images')
ALTS_DIR = os.path.join(OUTPUT_DIR, 'alternatives')
PUBLIC_OUTPUT_DIR = os.path.join(BASE_DIR, 'public', 'catalogue_images')

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(ALTS_DIR, exist_ok=True)
os.makedirs(PUBLIC_OUTPUT_DIR, exist_ok=True)

ITEMS_CONFIG = [
    {
        "id": "mat-banq-2-beige",
        "order": "01",
        "slug": "banquette-2-places-beige",
        "name": "Banquette 2 places – Beige",
        "category": "BANQUETTES",
        "description": "Banquette 2 places en velours beige élégante pour coin lounge, salon et réception.",
        "queries": [
            "banquette 2 places beige velours reception mariage",
            "canape 2 places velours beige lounge evenementiel",
            "banquette 2 places beige scandinave"
        ]
    },
    {
        "id": "mat-banq-2-taupe",
        "order": "02",
        "slug": "banquette-2-places-taupe",
        "name": "Banquette 2 places – Taupe",
        "category": "BANQUETTES",
        "description": "Banquette 2 places en velours taupe pour coin lounge et réception haut de gamme.",
        "queries": [
            "banquette 2 places velours taupe evenement",
            "canape 2 places velours taupe lounge",
            "banquette 2 places taupe reception"
        ]
    },
    {
        "id": "mat-deco-rideau-tresse",
        "order": "03",
        "slug": "rideau-tresse-3x4m",
        "name": "Rideau tressé 3 × 4 m",
        "category": "DÉCORATIONS",
        "description": "Structure incluse. Rideau tressé macramé / boisé décoratif pour scénographie et cérémonie.",
        "queries": [
            "rideau macrame mariage toile de fond",
            "rideau tresse decoration arriere plan mariage",
            "arche rideau tresse boheme mariage"
        ],
        "local_repo_ref": "src/img/insta/rideau-tresse-01.jpg"
    },
    {
        "id": "mat-deco-arche-ronde",
        "order": "04",
        "slug": "arche-de-fleurs-ronde",
        "name": "Arche de fleurs ronde",
        "category": "DÉCORATIONS",
        "description": "Structure + fleurs incluses. Arche cercle doré ornée de compositions florales pour cérémonie de mariage.",
        "queries": [
            "arche de fleurs ronde mariage structure cercle floral",
            "arche florale ronde mariage blanc",
            "arche de mariage ronde fleurie"
        ],
        "local_repo_ref": "src/img/insta/arche-fleurs-ronde-01.jpg"
    },
    {
        "id": "mat-deco-arche-carree",
        "order": "05",
        "slug": "arche-de-fleurs-carree",
        "name": "Arche de fleurs carrée",
        "category": "DÉCORATIONS",
        "description": "Structure + fleurs incluses. Arche carrée fleurie pour cérémonie laïque et fond de réception.",
        "queries": [
            "arche florale carree mariage fleurs blanches",
            "arche de mariage carree fleurie",
            "arche bois carree fleurs mariage reception"
        ]
    },
    {
        "id": "mat-table-rect",
        "order": "06",
        "slug": "table-rectangulaire",
        "name": "Table rectangulaire",
        "category": "TABLES",
        "description": "Table pliante rectangulaire de banquet pour 6 à 8 personnes, idéale pour réceptions et buffets.",
        "queries": [
            "table pliante rectangulaire banquet traiteur",
            "table rectangulaire banquet reception mariage",
            "table pliante traiteur 183 cm"
        ],
        "local_repo_ref": "src/img/insta/table-rectangulaire-01.jpg"
    },
    {
        "id": "mat-table-ronde-152",
        "order": "07",
        "slug": "table-ronde-diam152cm",
        "name": "Table ronde Ø152 cm",
        "category": "TABLES",
        "description": "Table ronde de banquet diamètre 152 cm pour 8 convives, plateau pliant traiteur.",
        "queries": [
            "table ronde pliante 152 cm banquet reception traiteur",
            "table pliante ronde diametre 152 cm",
            "table ronde banquet 152cm"
        ],
        "local_repo_ref": "src/img/insta/table-ronde-01.jpg"
    },
    {
        "id": "mat-chaise-napoleon",
        "order": "08",
        "slug": "chaise-napoleon",
        "name": "Chaise Napoléon",
        "category": "CHAISES",
        "description": "Chaise Napoléon III blanche élégante pour mariage, gala et réception haut de gamme.",
        "queries": [
            "chaise napoleon blanche mariage reception",
            "chaise napoleon 3 blanche mariage",
            "chaise napoleon reception blanc"
        ],
        "local_repo_ref": "src/img/insta/chaise-napoleon-01.jpg"
    },
    {
        "id": "mat-tente-32",
        "order": "09",
        "slug": "tente-de-reception-32m2-4x8m",
        "name": "Tente de réception 32 m² (4 × 8 m)",
        "category": "TENTES",
        "description": "Installation, désinstallation et lestage (150 kg) inclus. Barnum blanc professionnel 4 × 8 m.",
        "queries": [
            "tente de reception barnum 4x8 m 32 m2 blanc mariage",
            "barnum reception 4x8 blanc professionnel",
            "chapiteau 4x8 blanc reception"
        ],
        "local_repo_ref": "src/img/insta/tente-barnum-01.jpg"
    },
    {
        "id": "mat-tente-50",
        "order": "10",
        "slug": "tente-de-reception-50m2-5x10m",
        "name": "Tente de réception 50 m² (5 × 10 m)",
        "category": "TENTES",
        "description": "Installation, désinstallation et lestage (200 kg) inclus. Tente de réception 5 × 10 m pour 50 personnes.",
        "queries": [
            "tente de reception barnum 5x10 m 50 m2 blanc reception mariage",
            "chapiteau 5x10 blanc mariage evenement",
            "barnum 5x10 m blanc professionnel"
        ]
    },
    {
        "id": "mat-tente-72",
        "order": "11",
        "slug": "tente-de-reception-72m2-6x12m",
        "name": "Tente de réception 72 m² (6 × 12 m)",
        "category": "TENTES",
        "description": "Installation, désinstallation et lestage (250 kg) inclus. Tente de réception 6 × 12 m pour 70 à 80 personnes.",
        "queries": [
            "tente de reception 6x12 m 72 m2 chapiteau blanc mariage",
            "chapiteau tente de reception 6x12 blanc",
            "barnum reception 6x12 blanc mariage"
        ]
    },
    {
        "id": "mat-tente-100",
        "order": "12",
        "slug": "tente-de-reception-100m2-5x20m",
        "name": "Tente de réception 100 m² (5 × 20 m)",
        "category": "TENTES",
        "description": "Installation, désinstallation et lestage (300 kg) inclus. Grand chapiteau de réception 5 × 20 m (100 m²).",
        "queries": [
            "chapiteau tente de reception 5x20 m blanc reception mariage",
            "tente de reception 100 m2 blanc evenementiel",
            "grand chapiteau reception mariage blanc"
        ]
    },
    {
        "id": "mat-opt-kit-led",
        "order": "13",
        "slug": "kit-lumiere-led",
        "name": "Kit Lumière LED",
        "category": "OPTIONS & ACCESSOIRES",
        "description": "2 barres LED 6000 W d'éclairage d'ambiance pour tente, scène et salle de réception.",
        "queries": [
            "barre led projecteur eclairage soiree reception evenementiel",
            "barre led eclairage tente chapiteau",
            "eclairage barre led soiree fete"
        ]
    },
    {
        "id": "mat-opt-parasol",
        "order": "14",
        "slug": "parasol-chauffant-electrique",
        "name": "Parasol chauffant électrique",
        "category": "OPTIONS & ACCESSOIRES",
        "description": "Parasol chauffant sur pied électrique infrarouge pour terrasse extérieure et cocktail.",
        "queries": [
            "parasol chauffant electrique sur pied terrasse reception",
            "chauffage parasol electrique exterieur",
            "parasol chauffant infrarouge sur pied"
        ]
    },
    {
        "id": "mat-opt-rallonge-5",
        "order": "15",
        "slug": "rallonge-electrique-5m",
        "name": "Rallonge électrique 5 mètres",
        "category": "OPTIONS & ACCESSOIRES",
        "description": "Rallonge électrique noire/orange professionnelle 5 mètres étanche extérieure.",
        "queries": [
            "rallonge electrique 5 metres professionnelle chantier",
            "prolongateur electrique 5m exterieur",
            "cable rallonge electrique 5m"
        ]
    },
    {
        "id": "mat-opt-rallonge-10",
        "order": "16",
        "slug": "rallonge-electrique-10m",
        "name": "Rallonge électrique 10 mètres",
        "category": "OPTIONS & ACCESSOIRES",
        "description": "Rallonge électrique professionnelle 10 mètres étanche extérieure pour alimentation tente.",
        "queries": [
            "rallonge electrique 10 metres pro exterieur chantier",
            "prolongateur electrique 10m etanche",
            "cable rallonge electrique 10m pro"
        ]
    },
    {
        "id": "mat-opt-poids-30",
        "order": "17",
        "slug": "poids-de-lestage-30kg",
        "name": "Poids de lestage 30 kg",
        "category": "OPTIONS & ACCESSOIRES",
        "description": "Poids de lestage lourd en fonte 30 kg pour ancrage et sécurité de chapiteau et tente.",
        "queries": [
            "poids de lestage 30 kg fonte tente reception chapiteau",
            "lest 30 kg chapiteau barnum",
            "disque de lestage fonte 30kg tente"
        ]
    },
    {
        "id": "mat-opt-galette",
        "order": "18",
        "slug": "option-galette-de-chaise",
        "name": "Option galette de chaise",
        "category": "OPTIONS & ACCESSOIRES",
        "description": "Option pour Chaise Napoléon. Galette coussin d'assise blanche capitonnée pour chaise Napoléon.",
        "queries": [
            "galette coussin assise chaise napoleon blanc",
            "coussin galette chaise napoleon blanc mariage",
            "galette assise blanche chaise reception"
        ]
    }
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def search_image_urls(query, limit=10):
    url = 'https://www.bing.com/images/search?q=' + urllib.parse.quote(query) + '&form=HDRSC2'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'&quot;murl&quot;:&quot;([^&]+)&quot;', html)
            filtered = []
            for m in matches:
                m_clean = m.replace('\\/', '/')
                if any(ext in m_clean.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                    filtered.append(m_clean)
                if len(filtered) >= limit:
                    break
            return filtered
    except Exception as e:
        print(f"  [WARN] Search failed for '{query}': {e}")
        return []

def download_and_verify(url, dest_path, min_dim=350):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            ct = resp.headers.get('Content-Type', '').lower()
            data = resp.read()
            if len(data) < 8000:  # must be at least 8KB
                return None
            with open(dest_path, 'wb') as f:
                f.write(data)

            # verify with sips
            res = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'format', dest_path], capture_output=True, text=True)
            if 'pixelWidth:' in res.stdout:
                w = int(re.search(r'pixelWidth:\s*(\d+)', res.stdout).group(1))
                h = int(re.search(r'pixelHeight:\s*(\d+)', res.stdout).group(1))
                fmt_match = re.search(r'format:\s*(\w+)', res.stdout)
                fmt = fmt_match.group(1).lower() if fmt_match else 'jpeg'
                if w >= min_dim and h >= min_dim:
                    return {'width': w, 'height': h, 'size': len(data), 'format': fmt, 'url': url}
            # Invalid or too small
            if os.path.exists(dest_path):
                os.remove(dest_path)
            return None
    except Exception as e:
        if os.path.exists(dest_path):
            try: os.remove(dest_path)
            except: pass
        return None

def process_all():
    manifest = []
    print(f"Starting image collection for {len(ITEMS_CONFIG)} catalogue items...")

    for item in ITEMS_CONFIG:
        item_id = item['id']
        name = item['name']
        slug = item['slug']
        order = item['order']
        print(f"\n=======================================================")
        print(f"[{order}/23] Processing {name} ({item_id})")
        print(f"Category: {item['category']}")
        print(f"Description: {item['description']}")

        # Primary file target
        primary_filename = f"{order}_{slug}.jpg"
        primary_path = os.path.join(OUTPUT_DIR, primary_filename)

        downloaded_alts = []
        primary_info = None

        candidate_urls = []
        for q in item['queries']:
            urls = search_image_urls(q, limit=8)
            for u in urls:
                if u not in candidate_urls:
                    candidate_urls.append(u)
            if len(candidate_urls) >= 12:
                break
            time.sleep(0.3)

        print(f"Found {len(candidate_urls)} candidate image URLs.")

        # Try downloading candidate images
        valid_downloads = []
        for idx, u in enumerate(candidate_urls):
            temp_path = os.path.join(ALTS_DIR, f"temp_{order}_{idx}.jpg")
            info = download_and_verify(u, temp_path)
            if info:
                valid_downloads.append((temp_path, info))
                print(f"  ✓ Valid image ({info['width']}x{info['height']}px, {info['size']//1024} KB): {u[:70]}...")
            if len(valid_downloads) >= 4:
                break
            time.sleep(0.2)

        if not valid_downloads:
            print(f"  [ERROR] No image could be downloaded for {item_id}!")
            # Check if there is a local fallback
            if 'local_repo_ref' in item and os.path.exists(os.path.join(BASE_DIR, item['local_repo_ref'])):
                local_src = os.path.join(BASE_DIR, item['local_repo_ref'])
                shutil.copy2(local_src, primary_path)
                res = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', primary_path], capture_output=True, text=True)
                w = int(re.search(r'pixelWidth:\s*(\d+)', res.stdout).group(1))
                h = int(re.search(r'pixelHeight:\s*(\d+)', res.stdout).group(1))
                primary_info = {
                    'width': w,
                    'height': h,
                    'size': os.path.getsize(primary_path),
                    'format': 'jpeg',
                    'url': f"Local asset: {item['local_repo_ref']}"
                }
                print(f"  ✓ Used local repository asset: {local_src}")
        else:
            # First valid download is primary
            best_temp, best_info = valid_downloads[0]
            shutil.move(best_temp, primary_path)
            primary_info = best_info

            # Remaining are alternatives
            for alt_idx, (alt_temp, alt_info) in enumerate(valid_downloads[1:], 1):
                alt_filename = f"{order}_{slug}_alt{alt_idx}.jpg"
                alt_dest = os.path.join(ALTS_DIR, alt_filename)
                shutil.move(alt_temp, alt_dest)
                alt_info['filename'] = alt_filename
                downloaded_alts.append(alt_info)

        # Mirror primary to public directory
        if os.path.exists(primary_path):
            shutil.copy2(primary_path, os.path.join(PUBLIC_OUTPUT_DIR, primary_filename))

        manifest_entry = {
            "order": int(order),
            "id": item_id,
            "name": name,
            "slug": slug,
            "category": item['category'],
            "description": item['description'],
            "primary_image": {
                "filename": primary_filename,
                "path": f"catalogue_images/{primary_filename}",
                "public_url": f"/catalogue_images/{primary_filename}",
                "width": primary_info['width'] if primary_info else None,
                "height": primary_info['height'] if primary_info else None,
                "size_bytes": primary_info['size'] if primary_info else None,
                "source_url": primary_info['url'] if primary_info else None
            },
            "alternatives": [
                {
                    "filename": a['filename'],
                    "path": f"catalogue_images/alternatives/{a['filename']}",
                    "width": a['width'],
                    "height": a['height'],
                    "source_url": a['url']
                } for a in downloaded_alts
            ]
        }
        manifest.append(manifest_entry)

    # Save manifest.json
    manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    shutil.copy2(manifest_path, os.path.join(PUBLIC_OUTPUT_DIR, 'manifest.json'))

    # Generate README.md in catalogue_images
    md_content = ["# Catalogue d'images - OA Événementiel\n"]
    md_content.append("Ce dossier contient les photos haute définition correspondant à chacun des articles du catalogue.\n")
    md_content.append(f"**Nombre d'articles :** {len(manifest)} articles\n")
    md_content.append("| N° | Article | Catégorie | Description | Dimensions | Image |")
    md_content.append("|---|---|---|---|---|---|")

    for entry in manifest:
        p = entry['primary_image']
        dims = f"{p['width']}×{p['height']} px" if p['width'] else "N/A"
        desc = entry['description'] or "-"
        md_content.append(f"| {entry['order']} | **{entry['name']}** | `{entry['category']}` | {desc} | {dims} | `catalogue_images/{p['filename']}` |")

    md_content.append("\n## Dossier des alternatives\n")
    md_content.append("Les angles alternatifs et photos complémentaires sont disponibles dans le dossier `alternatives/`.\n")

    with open(os.path.join(OUTPUT_DIR, 'README.md'), 'w', encoding='utf-8') as f:
        f.write("\n".join(md_content))

    print("\n=======================================================")
    print("SUCCESS: All catalogue images processed and organized!")
    print(f"Folder location: {OUTPUT_DIR}")
    print(f"Manifest: {manifest_path}")

if __name__ == '__main__':
    process_all()
