import sqlite3
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'data', 'db.sqlite')
MANIFEST_PATH = os.path.join(BASE_DIR, 'catalogue_images', 'manifest.json')

def apply_images():
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    count = 0
    for item in manifest:
        item_id = item['id']
        img_url = item['primary_image']['public_url']
        cursor.execute("UPDATE materials SET image_url = ? WHERE id = ?", (img_url, item_id))
        count += cursor.rowcount

    conn.commit()
    conn.close()
    print(f"Updated {count} materials with new catalogue images in {DB_PATH}.")

if __name__ == '__main__':
    apply_images()
