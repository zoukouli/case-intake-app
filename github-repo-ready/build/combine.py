import json
shell = open("app_shell.html").read()
data = open("/sessions/wizardly-loving-rubin/mnt/outputs/app_data.json").read()
med_data = open("/sessions/wizardly-loving-rubin/mnt/outputs/med_data.json").read()
js = open("app_logic.js").read()
out = shell.replace("__APP_DATA__", data).replace("__MED_DATA__", med_data).replace("__APP_JS__", js)
with open("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "w") as f:
    f.write(out)
print("combined", len(out))
