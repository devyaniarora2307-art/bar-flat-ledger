"""
Parses raw Facebook post text into structured flat-hunting fields:
area(s), BHK, rent, gender preference, move-in date, listing vs seeking.
Shared by the daily merge_and_build.py pipeline.
"""
import re

AREA_CANON = {
    "Koramangala": ["koramangala", "kormangala"],
    "HSR Layout": ["hsr layout", "hsr"],
    "Indiranagar": ["indiranagar", "indira nagar"],
    "Whitefield": ["whitefield"],
    "Marathahalli": ["marathahalli", "marathahali", "marathalli"],
    "BTM Layout": ["btm layout", "btm"],
    "Jayanagar": ["jayanagar"],
    "JP Nagar": ["jp nagar", "j.p. nagar", "jaya prakash nagar"],
    "Bellandur": ["bellandur"],
    "Sarjapur Road": ["sarjapur road", "sarjapur"],
    "Haralur Road": ["haralur road", "haralur", "harlur road", "harlur"],
    "Electronic City": ["electronic city", "e-city", "ecity", "electronics city"],
    "Bannerghatta Road": ["bannerghatta road", "bannerghatta"],
    "Hebbal": ["hebbal"],
    "Yelahanka": ["yelahanka", "yelahanka new town"],
    "Malleshwaram": ["malleshwaram", "malleswaram"],
    "Rajajinagar": ["rajajinagar"],
    "Basavanagudi": ["basavanagudi"],
    "Banashankari": ["banashankari"],
    "Kalyan Nagar": ["kalyan nagar"],
    "Kammanahalli": ["kammanahalli", "kammanhalli"],
    "RT Nagar": ["rt nagar", "r.t. nagar"],
    "Domlur": ["domlur"],
    "Ulsoor": ["ulsoor", "halasuru"],
    "MG Road": ["mg road", "m.g. road"],
    "Richmond Town": ["richmond town", "richmond road"],
    "Cox Town": ["cox town"],
    "CV Raman Nagar": ["cv raman nagar", "c.v. raman nagar"],
    "Old Madras Road": ["old madras road", "old madras rd"],
    "Munnekollal": ["munnekollal", "munnekollala"],
    "Brookefield": ["brookefield", "brook field"],
    "ITPL": ["itpl"],
    "KR Puram": ["kr puram", "k.r. puram", "krishnarajapuram"],
    "Hoodi": ["hoodi"],
    "Mahadevapura": ["mahadevapura", "mahadevpura"],
    "Panathur": ["panathur"],
    "Varthur": ["varthur"],
    "Doddanekundi": ["doddanekundi", "doddanekkundi"],
    "Kadubeesanahalli": ["kadubeesanahalli"],
    "Kundalahalli": ["kundalahalli"],
    "Thanisandra": ["thanisandra"],
    "Manyata Tech Park": ["manyata tech park", "manyata"],
    "Nagawara": ["nagawara"],
    "Vidyaranyapura": ["vidyaranyapura"],
    "Ramamurthy Nagar": ["ramamurthy nagar"],
    "Frazer Town": ["frazer town"],
    "Wilson Garden": ["wilson garden"],
    "Shanti Nagar": ["shanti nagar", "shantinagar"],
    "Vijayanagar": ["vijayanagar", "vijaynagar"],
    "RR Nagar": ["rr nagar", "rajarajeshwari nagar", "r.r. nagar"],
    "Uttarahalli": ["uttarahalli"],
    "Kengeri": ["kengeri"],
    "Nagarbhavi": ["nagarbhavi"],
    "Yeshwanthpur": ["yeshwanthpur", "yeshwantpur"],
    "Akshaya Nagar": ["akshaya nagar"],
    "Horamavu": ["horamavu"],
    "HRBR Layout": ["hrbr layout", "hrbr"],
    "Kaggadasapura": ["kaggadasapura"],
    "Kadugodi": ["kadugodi"],
    "Devarabisanahalli": ["devarabisanahalli", "devarabeesanahalli"],
    "Silk Board": ["silk board"],
    "Bommanahalli": ["bommanahalli"],
    "HAL Layout": ["hal layout"],
    "Jalahalli": ["jalahalli"],
    "Bagalur": ["bagalur"],
    "Hennur": ["hennur"],
    "Banaswadi": ["banaswadi"],
    "Chandapura": ["chandapura"],
    "Attibele": ["attibele"],
    "Begur": ["begur"],
    "Sahakar Nagar": ["sahakar nagar"],
    "Vignana Nagar": ["vignana nagar"],
    "AECS Layout": ["aecs layout"],
    "Kasavanahalli": ["kasavanahalli", "kaikondrahalli", "kaikonrahalli"],
    "Gottigere": ["gottigere"],
    "Anjanapura": ["anjanapura"],
    "Peenya": ["peenya"],
    "Nelamangala": ["nelamangala"],
    "Hosur Road": ["hosur road"],
    "Jigani": ["jigani"],
    "Bommasandra": ["bommasandra"],
    "Kudlu": ["kudlu", "kudlu gate"],
    "Singasandra": ["singasandra"],
    "Hongasandra": ["hongasandra"],
    "Arekere": ["arekere"],
    "Bilekahalli": ["bilekahalli"],
    "Konanakunte": ["konanakunte"],
    "Kanakapura Road": ["kanakapura road", "kanakapura"],
    "Padmanabhanagar": ["padmanabhanagar"],
    "Girinagar": ["girinagar"],
    "Chamrajpet": ["chamrajpet"],
    "Seshadripuram": ["seshadripuram"],
    "Sadashivanagar": ["sadashivanagar"],
    "Sanjaynagar": ["sanjaynagar", "sanjay nagar"],
    "Mathikere": ["mathikere"],
    "Benson Town": ["benson town"],
    "Kammagondanahalli": ["kammagondanahalli", "kg halli"],
    "Jakkur": ["jakkur"],
    "Amruthahalli": ["amruthahalli"],
    "Byatarayanapura": ["byatarayanapura"],
    "Kogilu": ["kogilu"],
    "Rajankunte": ["rajankunte"],
    "Devanahalli": ["devanahalli"],
    "Kothanur": ["kothanur"],
    "Kalkere": ["kalkere"],
    "Tin Factory": ["tin factory"],
    "Bidarahalli": ["bidarahalli"],
    "Budigere Cross": ["budigere cross", "budigere"],
    "Channasandra": ["channasandra"],
    "Neeladri Nagar": ["neeladri nagar"],
    "Agara": ["agara"],
    "Iblur": ["iblur"],
    "Green Glen Layout": ["green glen layout", "green glen"],
    "Ambalipura": ["ambalipura"],
    "Gunjur": ["gunjur"],
    "Chikkabellandur": ["chikkabellandur"],
    "Carmelaram": ["carmelaram"],
    "Balagere": ["balagere"],
    "Seegehalli": ["seegehalli"],
    "Ramagondanahalli": ["ramagondanahalli"],
    "Immadihalli": ["immadihalli"],
    "Basaveshwara Nagar": ["basaveshwara nagar"],
    "Vasanth Nagar": ["vasanth nagar", "vasanthnagar"],
    "Cunningham Road": ["cunningham road"],
    "Race Course Road": ["race course road"],
    "Palace Road": ["palace road"],
    "Nandini Layout": ["nandini layout"],
    "Attiguppe": ["attiguppe"],
    "Ittamadu": ["ittamadu"],
    "Chikkalasandra": ["chikkalasandra"],
    "Subramanyapura": ["subramanyapura"],
    "Talaghattapura": ["talaghattapura"],
    "Kumaraswamy Layout": ["kumaraswamy layout", "ks layout"],
}

_ALIAS_PAIRS = sorted(
    ((alias, canon) for canon, aliases in AREA_CANON.items() for alias in aliases),
    key=lambda x: -len(x[0]),
)

BHK_RE = re.compile(r'(\d)\s*[- ]?\s*BHK', re.I)
RK_RE = re.compile(r'(\d)\s*RK\b', re.I)
RENT_RE = re.compile(r'(?:₹|rs\.?|inr)\s?([\d,]{4,7})(?:\s?/-?)?(?:\s?(?:per\s?month|pm|p\.m\.|monthly))?', re.I)
RENT_K_RE = re.compile(r'\b(\d{2,3})\s?k\b(?:\s?(?:per\s?month|pm|rent))?', re.I)
FEMALE_RE = re.compile(r'\b(female|girl|women|ladies)\b', re.I)
MALE_RE = re.compile(r'\b(male|boy|men)\b', re.I)
COED_RE = re.compile(r'\b(co-?ed|any gender|mixed)\b', re.I)
MOVE_DATE_RE = re.compile(
    r'\b(asap|immediate(?:ly)?|(?:\d{1,2}(?:st|nd|rd|th)?\s?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)|'
    r'(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s?\d{1,2}(?:st|nd|rd|th)?))\b',
    re.I,
)

GROUP_MAP = {
    "https://www.facebook.com/groups/117112802199699": "Bangalore Flats & Flatmates",
    "https://www.facebook.com/groups/838402552906457": "Flat & Flatmates Without Brokers",
    "https://www.facebook.com/groups/876779221120021": "Bangalore Rentals",
    "https://www.facebook.com/groups/427162957648685": "BLR PG/Flatmates",
}


def extract_bhk(text):
    m = BHK_RE.search(text)
    if m:
        return f"{m.group(1)}BHK"
    m = RK_RE.search(text)
    if m:
        return f"{m.group(1)}RK"
    return None


def extract_rent(text):
    m = RENT_RE.search(text)
    if m:
        val = m.group(1).replace(',', '')
        try:
            n = int(val)
            if 3000 <= n <= 300000:
                return n
        except ValueError:
            pass
    m = RENT_K_RE.search(text)
    if m:
        n = int(m.group(1)) * 1000
        if 3000 <= n <= 300000:
            return n
    return None


def extract_areas(text):
    tl = text.lower()
    found, seen = [], set()
    for alias, canon in _ALIAS_PAIRS:
        if canon in seen:
            continue
        if re.search(r'\b' + re.escape(alias) + r'\b', tl):
            found.append(canon)
            seen.add(canon)
    return found


def extract_gender(text):
    if FEMALE_RE.search(text):
        return "Female"
    if MALE_RE.search(text):
        return "Male"
    if COED_RE.search(text):
        return "Co-ed/Any"
    return None


def extract_movein(text):
    m = MOVE_DATE_RE.search(text)
    return m.group(0) if m else None


def post_type(text):
    tl = text.lower()
    seek_kw = ["looking for", "looking to rent", "need a", "in search of", "want to rent", "searching for"]
    offer_kw = ["available", "vacant", "for rent", "up for rent", "listing", "one room available",
                "seat available", "gated community", "premium"]
    is_seek = any(k in tl for k in seek_kw)
    is_offer = any(k in tl for k in offer_kw)
    if is_offer and not is_seek:
        return "Listing"
    if is_seek and not is_offer:
        return "Seeking"
    if is_offer and is_seek:
        return "Listing"
    return "Unclear"


def parse_post(d):
    """Takes one raw Apify dataset item, returns our structured row or None."""
    text = d.get('text') or ''
    if not text.strip():
        return None
    g = (d.get('facebookUrl') or '').rstrip('/')
    return {
        "postLink": d.get('url') or d.get('link'),
        "groupUrl": d.get('facebookUrl'),
        "groupName": GROUP_MAP.get(g, g),
        "author": (d.get('user') or {}).get('name'),
        "postedAt": d.get('time'),
        "bhk": extract_bhk(text),
        "areas": extract_areas(text),
        "rent": extract_rent(text),
        "gender": extract_gender(text),
        "moveIn": extract_movein(text),
        "type": post_type(text),
        "snippet": text.strip().replace('\n', ' ')[:220],
    }
