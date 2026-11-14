import asyncio
import json
import os
import re
import sys
from io import BytesIO
from urllib.parse import urljoin, urlparse, unquote

import pandas as pd
import pdfplumber
import requests
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

INSTITUTIONS = {
    "אוניברסיטת אריאל": "https://www.ariel.ac.il",
    "אוניברסיטת בן-גוריון בנגב": "https://www.bgu.ac.il",
    "אוניברסיטת בר-אילן": "https://www.biu.ac.il",
    "אוניברסיטת חיפה": "https://www.haifa.ac.il",
    "אוניברסיטת רייכמן": "https://www.runi.ac.il",
    "אוניברסיטת תל אביב": "https://www.tau.ac.il",
    "האוניברסיטה העברית": "https://new.huji.ac.il",
    "האוניברסיטה הפתוחה": "https://academic.openu.ac.il",
    "הטכניון": "https://ugportal.technion.ac.il",
    "תל-חי אוניברסיטת קריית שמונה בגליל": "https://www.telhai.ac.il",
    "אפקה – המכללה האקדמית להנדסה": "https://www.afeka.ac.il",
    "המכללה האקדמית אחוה": "https://www.achva.ac.il",
    "המכללה האקדמית אשקלון": "https://www.aac.ac.il",
    "המכללה האקדמית גליל מערבי": "https://www.wgalil.ac.il",
    "המכללה האקדמית הדסה": "https://www.hac.ac.il",
    "המכללה האקדמית כנרת": "https://www.kinneret.ac.il",
    "המכללה האקדמית להנדסה אורט בראודה": "https://www.braude.ac.il",
    "המכללה האקדמית להנדסה סמי שמעון": "https://www.sce.ac.il",
    "המכללה האקדמית נתניה": "https://www.netanya.ac.il",
    "המכללה האקדמית ספיר": "https://www.sapir.ac.il",
    "המכללה האקדמית עמק יזרעאל": "https://www.yvc.ac.il",
    "המכללה האקדמית צפת": "https://www.zefat.ac.il",
    "המכללה האקדמית תל אביב-יפו": "https://www.mta.ac.il",
    "המכללה למינהל": "https://www.colman.ac.il",
    "המרכז האקדמי לב": "https://www.jct.ac.il",
    "המרכז האקדמי למשפט ולעסקים": "https://www.clb.ac.il",
    "המרכז האקדמי פרס": "https://www.pac.ac.il",
    "המרכז האקדמי רופין": "https://www.ruppin.ac.il",
    "המרכז האקדמי שלם": "https://www.shalem.ac.il",
    "המרכז האקדמי שערי מדע ומשפט": "https://www.mishpat.ac.il",
    "הקריה האקדמית אונו": "https://www.ono.ac.il",
    "מכון טכנולוגי חולון HIT": "https://www.hit.ac.il",
    "מכון שכטר למדעי היהדות": "https://www.schechter.ac.il",
    "עזריאלי – מכללה אקדמית להנדסה ירושלים": "https://www.jce.ac.il",
    "אוהלו – מכללה אקדמית לחינוך ולספורט": "https://www.ohalo.ac.il",
    "אורות ישראל": "https://www.orot.ac.il",
    "אורנים – מכללה אקדמית לחינוך": "https://www.oranim.ac.il",
    "אלקאסמי – מכללה אקדמית לחינוך": "https://www.qsm.ac.il",
    "אמונה-אפרתה": "https://www.emef.ac.il",
    "האקדמית לוינסקי-וינגייט": "https://www.l-w.ac.il",
    "המכללה האקדמית בית ברל": "https://www.beitberl.ac.il",
    "המכללה האקדמית גבעת וושינגטון": "https://www.washington.ac.il",
    "המכללה האקדמית הדתית לחינוך שאנן": "https://www.shaanan.ac.il",
    "המכללה האקדמית הערבית לחינוך": "https://www.arabcol.ac.il",
    "המכללה האקדמית הרצוג": "https://www.herzog.ac.il",
    "המכללה האקדמית לחינוך גורדון": "https://www.gordon.ac.il",
    "המכללה האקדמית לחינוך דוד ילין": "https://www.dyellin.ac.il",
    "המכללה האקדמית לחינוך סכנין": "https://www.sakhnin.ac.il",
    "המכללה האקדמית לחינוך קיי": "https://www.kaye.ac.il",
    "המכללה האקדמית לחינוך תלפיות": "https://www.talpiot.ac.il",
    "חמדת הדרום": "https://www.hemdat.ac.il",
    "מכללה ירושלים": "https://www.jmc.ac.il",
    "סמינר הקיבוצים": "https://www.smkb.ac.il",
    "בצלאל – אקדמיה לאמנות ועיצוב": "https://www.bezalel.ac.il",
    "האקדמיה למוסיקה ולמחול": "https://www.jamd.ac.il",
    "ויצו חיפה – המרכז האקדמי לעיצוב ולחינוך": "https://www.wizodzn.ac.il",
    "שנקר": "https://www.shenkar.ac.il",
    "המכללה הטכנולוגית באר שבע": "https://www.tcb.ac.il",
    "מכללת אורט הרמלין": "https://hermelin.ort.org.il",
    "מכללת אורט סינגאלובסקי": "https://singalovski.ort.org.il"
}

URL_KEYWORDS = [
    "תוכנית-לימוד", "תכנית-לימוד", "תוכניות-לימוד", "תכניות-לימוד",
    "curriculum", "courses", "syllabus", "shnaton", "yedion",
    "שנתון", "ידיעון", "קורסים", "מערכת-שעות", "תואר-ראשון", "תואר-שני"
]

COURSE_TABLE_INDICATORS = [
    "שם הקורס", "שם קורס", "שם המקצוע", "נ\"ז", "נקודות זכות", "נק' זכות",
    "ש\"ס", "שעות", "סמסטר", "דרישות קדם", "קורסי חובה", "קורסי בחירה",
    "מספר קורס", "מס' קורס", "קוד קורס"
]

os.makedirs("curricula/json", exist_ok=True)
os.makedirs("curricula/markdown", exist_ok=True)


def is_valid_curriculum_table(df):
    table_str = " ".join(df.astype(str).values.flatten()) + " " + " ".join(map(str, df.columns))
    matches = sum(1 for kw in COURSE_TABLE_INDICATORS if kw in table_str)
    return matches >= 2 and len(df) >= 2


def discover_from_sitemap(base_url):
    candidate_urls = set()
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    for path in ["/sitemap_index.xml", "/sitemap.xml", "/wp-sitemap.xml"]:
        try:
            r = requests.get(urljoin(base_url, path), headers=headers, timeout=15)
            if r.status_code == 200 and "<loc>" in r.text:
                soup = BeautifulSoup(r.text, "xml")
                locs = [loc.get_text(strip=True) for loc in soup.find_all("loc")]
                sub_sitemaps = [u for u in locs if u.endswith(".xml") or "sitemap" in u]
                page_urls = [u for u in locs if u not in sub_sitemaps]

                for sub_sm in sub_sitemaps[:20]:
                    if any(skip in sub_sm for skip in ["post", "news", "event", "author", "tag"]):
                        continue
                    try:
                        sub_r = requests.get(sub_sm, headers=headers, timeout=15)
                        if sub_r.status_code == 200:
                            sub_soup = BeautifulSoup(sub_r.text, "xml")
                            page_urls.extend([l.get_text(strip=True) for l in sub_soup.find_all("loc")])
                    except Exception:
                        pass

                for u in page_urls:
                    if any(kw in unquote(u).lower() for kw in URL_KEYWORDS):
                        candidate_urls.add(u)
                break
        except Exception:
            continue
    return list(candidate_urls)


def extract_pdf_curriculum(pdf_url):
    tables_data = []
    try:
        r = requests.get(pdf_url, timeout=30)
        if r.status_code == 200:
            with pdfplumber.open(BytesIO(r.content)) as pdf:
                for page_num, pdf_page in enumerate(pdf.pages[:40], start=1):
                    for t_idx, table in enumerate(pdf_page.extract_tables()):
                        rows = [[(c or "").replace("\n", " ").strip() for c in row] for row in table if any(row)]
                        if len(rows) > 1:
                            df = pd.DataFrame(rows[1:], columns=rows[0])
                            if is_valid_curriculum_table(df):
                                tables_data.append({
                                    "section": f"עמוד {page_num} - טבלה {t_idx + 1}",
                                    "markdown": df.to_markdown(index=False),
                                    "courses": df.to_dict(orient="records")
                                })
    except Exception:
        pass
    return tables_data


async def unlock_dynamic_tables(page):
    await page.evaluate("""() => {
        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
            window.jQuery('table').each(function() {
                try {
                    if (window.jQuery.fn.DataTable.isDataTable(this)) {
                        let dt = window.jQuery(this).DataTable();
                        dt.search('').columns().search('');
                        dt.page.len(-1).draw();
                    }
                } catch (e) {}
            });
        }
        document.querySelectorAll('select').forEach(select => {
            for (let opt of select.options) {
                if (opt.value === '-1' || opt.text.toLowerCase().includes('all') || opt.text.includes('הכל')) {
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
        document.querySelectorAll('.tab-pane, .elementor-tab-content, .vc_tta-panel-body, [role="tabpanel"], .collapse').forEach(el => {
            el.style.display = 'block';
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            el.style.height = 'auto';
            el.classList.add('active', 'show', 'in');
        });
    }""")
    await page.wait_for_timeout(1000)


async def scrape_page(page, url):
    if url.lower().endswith(".pdf"):
        return {"title": os.path.basename(url), "tables": extract_pdf_curriculum(url), "links": []}

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await unlock_dynamic_tables(page)
    except Exception:
        return {"title": url, "tables": [], "links": []}

    soup = BeautifulSoup(await page.content(), "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else url
    tables_data = []

    for idx, table in enumerate(soup.find_all("table")):
        prev = table.find_previous(["h1", "h2", "h3", "h4", "strong"])
        section = prev.get_text(" ", strip=True) if prev else f"טבלת קורסים {idx + 1}"
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
        rows = []
        for tr in table.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
            if cells and cells != headers and any(cells):
                rows.append(cells)

        if len(rows) >= 2:
            max_cols = max(len(r) for r in rows)
            norm_rows = [r + [""] * (max_cols - len(r)) for r in rows]
            df = pd.DataFrame(norm_rows)
            if headers and len(headers) == max_cols:
                df.columns = headers

            if is_valid_curriculum_table(df):
                tables_data.append({
                    "section": section[:100],
                    "markdown": df.to_markdown(index=False),
                    "courses": df.to_dict(orient="records")
                })

    base_domain = urlparse(url).netloc
    links = []
    for a in soup.find_all("a", href=True):
        href = urljoin(url, a["href"]).split("#")[0]
        if urlparse(href).netloc == base_domain:
            txt = a.get_text(" ", strip=True)
            if any(kw in txt for kw in ["תוכנית לימוד", "תכנית לימוד", "שנתון", "ידיעון", "קורסים", "תואר"]) or any(kw in unquote(href).lower() for kw in URL_KEYWORDS):
                links.append(href)

    return {"title": title, "tables": tables_data, "links": list(set(links))}


async def process_institution(inst_name, base_url, max_pages=300):
    print(f"[*] סורק את: {inst_name} ({base_url})")
    sitemap_urls = discover_from_sitemap(base_url)
    queue = [base_url] + sitemap_urls
    visited = set()
    programs = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(locale="he-IL")
        page = await context.new_page()

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            res = await scrape_page(page, url)
            if res["tables"]:
                programs.append({
                    "degree_title": res["title"],
                    "source_url": url,
                    "curriculum_sections": res["tables"]
                })
                print(f"  [+] נשמרה תוכנית לימודים: {res['title'][:60]} ({len(res['tables'])} טבלאות)")

            for l in res["links"]:
                if l not in visited and l not in queue:
                    queue.append(l)

        await browser.close()

    safe_name = re.sub(r'[\\/*?:"<>|\s–-]+', "_", inst_name).strip("_")

    with open(f"curricula/json/{safe_name}.json", "w", encoding="utf-8") as f:
        json.dump({"institution": inst_name, "programs": programs}, f, ensure_ascii=False, indent=2)

    with open(f"curricula/markdown/{safe_name}.md", "w", encoding="utf-8") as f:
        f.write(f"# {inst_name} – תוכניות לימודים\n\n")
        for prog in programs:
            f.write(f"## {prog['degree_title']}\nמקור: {prog['source_url']}\n\n")
            for sec in prog["curriculum_sections"]:
                f.write(f"### {sec['section']}\n\n{sec['markdown']}\n\n")


async def main():
    batch_index = int(sys.argv[1]) if len(sys.argv) > 1 else None
    total_batches = int(sys.argv[2]) if len(sys.argv) > 2 else 1

    items = list(INSTITUTIONS.items())
    if batch_index is not None:
        items = [item for idx, item in enumerate(items) if idx % total_batches == batch_index]

    for inst_name, base_url in items:
        await process_institution(inst_name, base_url)


if __name__ == "__main__":
    asyncio.run(main())
