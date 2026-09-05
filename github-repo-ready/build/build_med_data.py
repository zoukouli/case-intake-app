import yaml, json

SRC = "/sessions/wizardly-loving-rubin/mnt/med_assistant/data"
OUT = "/sessions/wizardly-loving-rubin/mnt/outputs/med_data.json"

with open(f"{SRC}/drug_classes.yaml") as f:
    classes_doc = yaml.safe_load(f)
with open(f"{SRC}/drug_aliases.yaml") as f:
    aliases_doc = yaml.safe_load(f)
with open(f"{SRC}/bridging_rules.yaml") as f:
    bridging_doc = yaml.safe_load(f)

classes_by_id = {}
for c in classes_doc["drug_classes"]:
    classes_by_id[c["id"]] = c

aliases = []
for a in aliases_doc["aliases"]:
    class_ids = a.get("class_ids") or [a.get("class_id")]
    aliases.append({
        "alias": a["alias"],
        "genericName": a.get("generic_name", a["alias"]),
        "classIds": class_ids,
    })

out = {
    "meta": classes_doc["ruleset_meta"],
    "classes": classes_by_id,
    "aliases": aliases,
    "unclassifiedPlaceholder": classes_doc.get("unclassified_placeholder"),
    "bridging": bridging_doc,
}

with open(OUT, "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)

print("wrote", OUT)
print("classes:", len(classes_by_id), "aliases:", len(aliases))
