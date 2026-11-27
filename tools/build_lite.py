#!/usr/bin/env python3
"""בונה את data-lite.json – גרסה קלה של data.json לשאלון בדף הבית (index.html).
להריץ אחרי כל עדכון של data.json:  python3 tools/build_lite.py
משאיר רק תארים פעילים ורק את השדות שהשאלון משתמש בהם. בלי אנשי קשר."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data.json'), encoding='utf-8'))
DROP_DEG = {'סוג פסיכומטרי', 'קשר: מייל', 'קשר: רמת פירוט', 'קשר: מקור', 'שכ"ל – מקור והערות'}
DROP_INST = {'מתוקצב', 'אתר אינטרנט', 'צביון בולט', 'הפרדה מגדרית', 'רכבת / רכבת קלה / רכבל', 'טלפון ראשי (מרכזייה)', 'הערת קשר', 'אתר רשמי',
             'דמי רישום (₪)', 'דמי אבטחה שנתיים – חובה (₪)', 'רווחה + אגודה – רשות (₪)', 'תשלומים – מקור והערות', 'עיר לחישוב מחיה', 'הרשמה – נבדק'}
L = {
    'תארים': [{k: v for k, v in d.items() if k not in DROP_DEG} for d in D['תארים'] if d.get('סטטוס') != 'לא קיים במוסד'],
    'מוסדות': [{k: v for k, v in i.items() if k not in DROP_INST} for i in D['מוסדות']],
    'עלויות מחיה': D.get('עלויות מחיה', []),
    'מלגות': D.get('מלגות', []),
    'מעונות': D.get('מעונות', []),
}
out = os.path.join(ROOT, 'data-lite.json')
json.dump(L, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('data-lite.json', os.path.getsize(out), 'bytes (data.json:', os.path.getsize(os.path.join(ROOT, 'data.json')), ')')
