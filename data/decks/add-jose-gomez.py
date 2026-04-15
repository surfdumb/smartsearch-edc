#!/usr/bin/env python3
"""
Run this from the smartsearch-edc repo root:
  python3 ~/Downloads/add-jose-gomez.py
Then:
  git add data/decks/cvw-ops-dir.json
  git commit -m "feat: add Jose Gomez to Crestview deck"
  git push origin main
"""
import json, os

FIXTURE_PATH = "data/decks/cvw-ops-dir.json"
if not os.path.exists(FIXTURE_PATH):
    print(f"ERROR: {FIXTURE_PATH} not found. Run this from the repo root.")
    exit(1)

with open(FIXTURE_PATH) as f:
    deck = json.load(f)

# Check if already added
if any(c.get("candidate_id") == "jose-gomez" for c in deck["candidates"]):
    print("Jose Gomez already in fixture. Nothing to do.")
    exit(0)

jose = {
    "candidate_id": "jose-gomez",
    "initials": "JG",
    "candidate_name": "Jose Gomez",
    "current_title": "Director of Operations",
    "current_company": "Currently unemployed (most recently Kadon Aerospace)",
    "location": "Rockford, Illinois",
    "photo_url": "",
    "headline": "Led 125-person aerospace operations with $144M output across CNC machining, assembly, and military platforms.",
    "compensation_alignment": "flexible",
    "career_trajectory": "lateral",
    "industry_shorthand": "Aerospace & Defense",
    "status": "new",
    "edc_data": {
        "candidate_name": "Jose Gomez",
        "current_title": "Director of Operations",
        "current_company": "Currently unemployed (most recently Kadon Aerospace)",
        "location": "Rockford, Illinois",
        "headline": "Led 125-person aerospace operations with $144M output across CNC machining, assembly, and military platforms.",
        "motivation_hook": "Seeks stable aerospace culture after two PE-driven eliminations; prioritizes fit over maximum pay.",
        "scope_match": [
            {"scope": "Headcount", "candidate_actual": "125 hourly employees + 5 supervisors at Collins Aerospace; 116 hourly + 8 supervisors at GE Aviation", "role_requirement": "Engineering team, programming team direct; production supervisor and supply chain dotted line across 75-person site", "alignment": "strong"},
            {"scope": "P&L", "candidate_actual": "$144M yearly output goal at Collins Aerospace; $53M at GE Aviation with $3.3M tooling budget ownership", "role_requirement": "$30M site revenue with VP/GM retaining P&L ownership; Director provides operational execution", "alignment": "strong"},
            {"scope": "Reporting Line", "candidate_actual": "Reported to VP overseeing 3-4 divisions at Collins; reported to Site Leader at GE Aviation and Woodward", "role_requirement": "Reports to VP/General Manager who oversees entire St. Louis site", "alignment": "strong"},
            {"scope": "Geography", "candidate_actual": "Single-site operations at Rockford facilities; managed two-building footprint at GE Aviation", "role_requirement": "St. Louis site with two buildings 3 blocks apart; serves as liaison to Florida site", "alignment": "strong"}
        ],
        "scope_seasoning": "Jose brings larger-scale operations experience from Collins Aerospace ($144M output, 125 employees) and GE Aviation ($53M output, 116 employees) to Kemco\u2019s $30M, 75-person site. His progression through business unit leadership at multi-division organizations positions him to provide structure and guidance while working under a VP/GM, though he has historically owned full P&L accountability rather than dotted-line production oversight. His two-building management experience at GE Aviation and cross-site coordination at Collins directly translate to Kemco\u2019s split-building footprint and Florida liaison requirements.",
        "key_criteria": [
            {"name": "Aerospace experience: Aerospace-dominant career, ideally throughout", "evidence": "Jose has spent <strong>100% of his 20+ year career</strong> in aerospace and defense manufacturing, progressing from CNC machinist apprentice through director roles at GE Aviation, Woodward, Collins Aerospace, and Kadon Aerospace manufacturing components for military and commercial aircraft including de-icing valves, generators, and defense platforms.", "context_anchor": "at GE Aviation, Collins Aerospace, Woodward"},
            {"name": "Operations background with technical credibility: Enough experience to call BS on engineers", "evidence": "Jose spent <strong>10-12 years as hands-on CNC machinist</strong> running mills, lathes, grinders, and manual machines before transitioning to operations leadership. At GE Aviation, the site leader created the Director of Operations role specifically for him because he had worked in manufacturing engineering, quality management, and every office in the facility.", "context_anchor": "at GE Aviation"},
            {"name": "CNC and machining experience: At least 50% of career in CNC machining", "evidence": "Jose significantly exceeds the 50% threshold with approximately <strong>60% of his career in CNC machining</strong>, including 12 years as hands-on machinist and lead operator running CNC mills, lathes, grinders, and lapping machines, followed by director roles overseeing machine shop operations in low-volume high-mix environments.", "context_anchor": "at Woodward, Hamilton Sundstrand, GE Aviation"},
            {"name": "Business unit level leadership experience: BU manager or program manager scale", "evidence": "Jose led business unit operations at Collins Aerospace managing <strong>125 hourly employees, 5 supervisors, and $144M yearly output</strong> with dotted-line responsibility for manufacturing engineering, quality, and continuous improvement, reporting to a VP who oversaw three to four other divisions of similar size.", "context_anchor": "at Collins Aerospace"},
            {"name": "Personality and culture fit \u2014 outgoing and personable: Customer-facing soft skills, not narrow-focused engineer", "evidence": "Jose reduced union grievances by <strong>85% in two years</strong> at Collins Aerospace by proactively opening communication channels, giving union representatives his cell phone number, and addressing concerns on the floor. He describes himself as a boots-on-ground leader who goes in early and stays late to engage operators on every shift.", "context_anchor": "at Collins Aerospace"},
            {"name": "Continuous improvement mindset and background", "evidence": "Jose is a certified <strong>Black Belt who delivered $1.25M in recognized savings</strong> as dedicated Lean Leader at GE Aviation, achieving 75% lead time reduction and 66% delinquency reduction. He has consistently embedded CI into operations roles, delivering $10M delinquency reduction at Woodward and $2M at Collins Aerospace.", "context_anchor": "at GE Aviation, Woodward, Collins Aerospace"}
        ],
        "compensation": {
            "current_base": "Not disclosed",
            "current_bonus": "Not disclosed",
            "current_lti": "Not disclosed",
            "current_total": "Currently unemployed. Most recent role at Kadon Aerospace: Not disclosed. Prior role at Collins Aerospace: $200,000+ base with bonus (total not specified)",
            "expected_base": "$170,000",
            "expected_bonus": "To be determined through negotiation",
            "expected_lti": "Not discussed",
            "expected_total": "$170,000 base + bonus (percentage TBD)",
            "flexibility": "Significant flexibility demonstrated. Jose is willing to accept $170,000 base versus previous $200,000+ at Collins Aerospace, stating he prioritizes job satisfaction over maximum compensation now that his children are becoming independent and he no longer has college cost pressures. He confirmed $170k base is acceptable and expressed openness to negotiating bonus percentage.",
            "budget_range": None,
            "budget_base": "Competitive with St. Louis region market",
            "budget_bonus": "Not discussed",
            "budget_lti": "Not discussed"
        },
        "notice_period": "Immediately available - currently unemployed since November 2025",
        "earliest_start_date": "Immediately available. Jose stated he could start as fast as needed, potentially within a week of receiving an offer.",
        "why_interested": [
            {"type": "pull", "headline": "Passion for aerospace and boots-on-ground operations leadership", "detail": "Jose explicitly stated aviation is his passion and expressed strong alignment with Kemco\u2019s low-volume high-mix CNC machining environment serving 90% military platforms for Boeing and Lockheed Martin. He values the boots-on-ground director role where his technical credibility and floor presence will matter daily, noting his preference for being on the production floor engaging with operators across all shifts."},
            {"type": "pull", "headline": "Cultural fit with tight-knit, stable organization", "detail": "Jose expressed strong attraction to Kemco\u2019s tight-knit community and low turnover, stating that 100-150 employee organizations are his comfort zone. He values collaborative environments and emphasized seeking a place he enjoys working rather than chasing maximum compensation, particularly now that his children are becoming independent and he no longer has college cost pressures."},
            {"type": "push", "headline": "Two consecutive position eliminations at PE-backed organizations", "detail": "Jose\u2019s position at Kadon Aerospace was eliminated after six months when a retiring director decided to remain. Prior to that, his role at Collins Aerospace ended after two years due to organizational restructuring. Both eliminations were due to external factors rather than performance, but the pattern has motivated him to seek a more stable environment."},
            {"type": "pull", "headline": "Opportunity to build continuous improvement capability from ground up", "detail": "Jose sees alignment with Kemco\u2019s early-stage lean journey and consultant-supported approach, having previously been hired as the first dedicated Lean Leader at GE Aviation to build CI capability from scratch. He views this as an opportunity to apply his Black Belt expertise and proven track record delivering $1.25M savings and 75% lead time reduction to establish structured continuous improvement processes."}
        ],
        "potential_concerns": [
            {"concern": "Two consecutive position eliminations within one year (Kadon Aerospace after 6 months in November 2025, Collins Aerospace after 2 years) may raise client questions about tenure stability, though both eliminations were due to external organizational factors rather than performance issues.", "severity": "significant"},
            {"concern": "Tendency toward overly detailed, rambling communication style during interview may require coaching for executive-level conciseness in client-facing situations, though this appears to stem from genuine enthusiasm and thoroughness rather than poor communication skills.", "severity": "development"},
            {"concern": "Rockford, Illinois to St. Louis commute (approximately 3.5-4 hours) would initially be solo arrangement without family until son finishes high school in two months. While Jose expressed willingness to commute and familiarity with St. Louis, the sustainability of this arrangement long-term should be validated, particularly given his emphasis on work-life balance and family considerations.", "severity": "significant"}
        ],
        "our_take": {
            "text": "We believe Jose is a genuinely enthusiastic and technically credible operations leader who would bring valuable aerospace machining expertise and continuous improvement capability to Kemco, though his tendency to provide lengthy, detailed explanations may require managing in client-facing situations. His passion for aviation, boots-on-ground leadership style, and proven ability to build collaborative relationships in union environments align well with Kemco\u2019s culture, and his compensation flexibility and willingness to commute demonstrate strong motivation for the right opportunity."
        },
        "search_name": "Kemco",
        "role_title": "Director of Operations",
        "generated_date": "15 Apr 2026",
        "consultant_name": "Tara Nugent",
        "match_score_percentage": None,
        "match_score_display": "HIDE"
    }
}

deck["candidates"].append(jose)

with open(FIXTURE_PATH, "w") as f:
    json.dump(deck, f, indent=2, ensure_ascii=False)

print(f"Done. Jose Gomez added. Total candidates: {len(deck['candidates'])}")
print("Now run:")
print("  git add data/decks/cvw-ops-dir.json")
print('  git commit -m "feat: add Jose Gomez to Crestview deck"')
print("  git push origin main")
