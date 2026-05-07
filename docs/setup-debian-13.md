# FlexWorkTwin auf Debian 13 (Trixie) aufsetzen

Schritt-für-Schritt-Anleitung für ein frisches Debian 13. Stack-Komponenten:

| Komponente | Port | Zweck |
|---|---|---|
| Postgres 16 | 5432 | Datenhaltung (Apps, Versionen, Ausführungen) |
| n8n | 5678 | API + Workflow-Engine (Webhooks) |
| Editor (AV) | 5174 | Web-Frontend für Arbeitsvorbereitung |
| Runtime (Werker) | 5175 | Web-Frontend für den Werker am Tisch |

Postgres und n8n laufen in Docker-Containern. Die beiden Frontends können entweder
- **als Dev-Server** mit `npm run dev` (heißes Reloading, gut zum Anpassen),
- **als statisches Build** über einen Webserver (nginx, caddy) ausgeliefert werden.

Diese Anleitung beschreibt beide Varianten.

---

## 1. VM-Voraussetzungen

- Debian 13 (Trixie), frisch installiert
- Mindestens **2 GB RAM, 2 vCPU, 10 GB Disk** (für Dev-Setup; Production darf größer sein)
- Netzwerkzugriff aufs Internet (für Paket-Downloads und Docker-Images)
- Ein Benutzer mit `sudo`-Rechten

In den folgenden Befehlen wird angenommen, dass du als normaler Benutzer angemeldet bist. `sudo` wird explizit verwendet.

---

## 2. System aktualisieren und Basistools installieren

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  ufw \
  htop
```

---

## 3. Docker Engine + Compose v2 installieren

Debian 13 hat kein offizielles Docker-Paket im Standard-Repo, das aktuell genug ist. Wir nutzen das offizielle Docker-Repo.

```bash
# 3.1 GPG-Schlüssel
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 3.2 Repo eintragen (Trixie heißt 'trixie')
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian \
  trixie stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3.3 Installieren
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# 3.4 Eigenen Benutzer in die docker-Gruppe (sudo nicht mehr nötig)
sudo usermod -aG docker $USER
# WICHTIG: einmal aus- und wieder einloggen, damit die Gruppe greift
```

> Falls du nicht ausloggen willst, kannst du in der aktuellen Shell `newgrp docker` ausführen.

**Test:**

```bash
docker run --rm hello-world
docker compose version
```

Beide Befehle müssen ohne Fehler durchlaufen.

---

## 4. Node.js 20 LTS installieren (für die Frontends)

Auch wenn die Frontends später als statisches Build ausgeliefert werden, brauchst du Node zum Bauen. Wir nehmen NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node --version   # v20.x.x
npm --version    # 10.x.x
```

---

## 5. Code auf die VM bringen

Drei Wege:

**Variante A — Git (empfohlen)**, sobald das Repo in einer Quelle liegt:

```bash
cd /opt
sudo mkdir -p flexworktwin && sudo chown $USER:$USER flexworktwin
cd flexworktwin
git clone <DEIN_REPO_URL> .
```

**Variante B — `scp` von deinem Windows-Rechner:**

```powershell
# Auf Windows in PowerShell, im Projektordner:
scp -r . user@vm-ip:/home/user/flexworktwin
```

**Variante C — `rsync`** (schneller, überspringt `node_modules`):

```bash
rsync -av --progress \
  --exclude node_modules --exclude dist --exclude .vite \
  ./ user@vm-ip:/home/user/flexworktwin/
```

---

## 6. Umgebungsvariablen vorbereiten

```bash
cd /opt/flexworktwin   # oder wo du die Files hingelegt hast
cp .env.example .env
nano .env
```

Mindestens setzen:

```ini
POSTGRES_DB=flexworktwin
POSTGRES_USER=fwt
POSTGRES_PASSWORD=<NEUES_PASSWORT>

# Wichtig: ein konsistenter Schlüssel, sobald produktiv eingesetzt
N8N_ENCRYPTION_KEY=<MINDESTENS_32_ZEICHEN_RANDOM>

# Public-URL der n8n-Instanz - im LAN/VM die IP der VM eintragen
VITE_N8N_BASE=http://<VM-IP>:5678/webhook
```

> Wenn du `POSTGRES_PASSWORD` änderst, muss der gleiche Wert auch in `n8n/credentials.json` stehen, sonst kann n8n nicht auf Postgres schreiben.

Wenn das Passwort geändert wurde, einmal die n8n-Cred-Datei anpassen:

```bash
nano n8n/credentials.json
# password-Feld setzen
```

---

## 7. Postgres + n8n starten

```bash
docker compose up -d
docker compose ps
```

Beide Container sollten `running` / `healthy` zeigen. Logs:

```bash
docker compose logs -f n8n
```

Beim ersten Start siehst du Zeilen wie:

```
[fwt-bootstrap] first start: importing credentials + workflows...
[fwt-bootstrap] importing workflows...
[fwt-bootstrap] activating workflows...
[fwt-bootstrap] done
```

Danach sollte `n8n ready on ::, port 5678` erscheinen.

---

## 8. n8n-Setup verifizieren

```bash
# n8n erreichbar?
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5678/healthz

# Webhook live?
curl -s http://localhost:5678/webhook/apps | head -c 200
```

Wenn `apps` ein JSON-Array (mindestens mit der seedeten Demo-App) zurückliefert: ✓.

> **Falls 404:** n8n hat die Workflows nicht aktiviert. Öffne `http://<VM-IP>:5678` im Browser, ggf. einmalig den Owner-Account anlegen, dann die Workflows in der Liste manuell aktivieren (Toggle rechts). Auf neueren n8n-Versionen wird die Owner-Registrierung erzwungen.

---

## 9. Frontends bauen und ausliefern

### 9a) Variante "Dev-Server" (für Entwicklung / interner Test)

```bash
cd /opt/flexworktwin
npm install --no-fund --no-audit
```

Damit der Dev-Server von außen erreichbar ist, im Frontend-`vite.config.ts` `host: true` setzen oder beim Aufruf `--host` mitgeben:

```bash
# Editor (in Terminal 1)
npm --workspace @fwt/editor run dev -- --host 0.0.0.0

# Runtime (in Terminal 2)
npm --workspace @fwt/runtime run dev -- --host 0.0.0.0
```

Aufruf: `http://<VM-IP>:5174` (Editor), `http://<VM-IP>:5175` (Runtime).

> Für Dauerbetrieb in einer VM bitte **nicht** Vite-Dev-Server nutzen — siehe 9b.

### 9b) Variante "Production-Build" (empfohlen für VM-Betrieb)

Frontends bauen:

```bash
cd /opt/flexworktwin

# Build-Time die Webhook-URL setzen, damit sie ins JS gebacken wird
echo "VITE_N8N_BASE=http://<VM-IP>:5678/webhook" > apps/editor/.env.production
echo "VITE_N8N_BASE=http://<VM-IP>:5678/webhook" > apps/runtime/.env.production

npm install --no-fund --no-audit
npm run build
```

Es entstehen `apps/editor/dist/` und `apps/runtime/dist/` — statische Dateien.

**Caddy als Reverse-Proxy / Webserver** (sehr einfach):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Caddyfile (`/etc/caddy/Caddyfile`):

```caddyfile
:80 {
  # Editor
  handle_path /editor/* {
    root * /opt/flexworktwin/apps/editor/dist
    try_files {path} /index.html
    file_server
  }

  # Runtime (Werker am Tisch)
  handle_path /runtime/* {
    root * /opt/flexworktwin/apps/runtime/dist
    try_files {path} /index.html
    file_server
  }

  # n8n-Webhooks unter gleicher Domain (vermeidet CORS)
  handle /webhook/* {
    reverse_proxy localhost:5678
  }

  # Default-Redirect
  redir / /editor/ permanent
}
```

Aktivieren:

```bash
sudo systemctl reload caddy
```

> Wenn du Frontends + n8n hinter dem gleichen Caddy-Host liegen lässt, kannst du `VITE_N8N_BASE=/webhook` (relativ) bauen — dann ist die App ortsunabhängig. Das ist sauberer als die VM-IP hartzucodieren.

Jetzt erreichbar:

- `http://<VM-IP>/editor/` — Editor (AV)
- `http://<VM-IP>/runtime/` — Runtime (Werker)
- `http://<VM-IP>:5678/` — n8n-UI (für Debug, später hinter Auth/Reverse-Proxy)

### 9c) Optional: TLS via Caddy + Domain

Wenn du eine Domain hast, ersetze `:80` durch den Domainnamen — Caddy holt automatisch ein Let's-Encrypt-Zertifikat:

```caddyfile
flexworktwin.example.com {
  ...
}
```

---

## 10. Firewall (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# n8n-UI nur freigeben, wenn du sie wirklich öffentlich brauchst
sudo ufw allow 5678/tcp
sudo ufw enable
sudo ufw status
```

Postgres (5432) und die Vite-Dev-Server (5174/5175) **nicht** öffentlich freigeben.

---

## 11. Stack-Verwaltung

```bash
# Logs
docker compose logs -f
docker compose logs -f n8n
docker compose logs -f postgres

# Stack neu starten
docker compose restart n8n

# Stack stoppen (Volumes bleiben erhalten)
docker compose down

# Stack inkl. Volumes löschen (DESTRUKTIV - alles weg)
docker compose down -v

# n8n auf neue Version aktualisieren
docker compose pull n8n
docker compose up -d n8n
```

---

## 12. Backup

Postgres-Dump (täglich per Cron):

```bash
sudo mkdir -p /var/backups/flexworktwin
docker exec fwt-postgres pg_dump -U fwt -Fc flexworktwin \
  > /var/backups/flexworktwin/fwt-$(date +%F).dump
```

n8n-Workflows sind im Code-Repo (`n8n/workflows/*.json`) — also schon versioniert. Ggf. zusätzlich das n8n-Daten-Volume sichern:

```bash
docker run --rm -v fwt_n8n-data:/data -v /var/backups/flexworktwin:/backup alpine \
  tar czf /backup/n8n-data-$(date +%F).tar.gz -C /data .
```

---

## 13. Erste Validierung

Im Browser nacheinander:

1. `http://<VM-IP>/editor/` öffnen → die Demo-App "Drehmoment-Pruefung Schaltschrank" erscheint in der Liste.
2. Auf die Karte klicken → Editor zeigt die Blöcke und das Metadaten-Panel.
3. Einen Block ändern → "ungespeichert" erscheint → Speichern.
4. Zurück zur Liste → die Versionsnummer ist hochgegangen.
5. `http://<VM-IP>/runtime/` öffnen → die App ist da, klicken, durchspielen.

Wenn alle Schritte funktionieren: System läuft. Bei Problemen siehe nächster Abschnitt.

---

## 14. Troubleshooting

| Symptom | Ursache | Lösung |
|---|---|---|
| Frontends zeigen "API offline" | n8n nicht erreichbar oder CORS blockiert | `docker compose logs n8n`, prüfen ob CORS-Origins in `docker-compose.yml` zu deiner URL passen |
| 404 von `/webhook/apps` | Workflows nicht aktiviert | n8n-UI öffnen, Workflows aktivieren (Toggle) |
| n8n verlangt Owner-Setup | Neuere n8n-Version | Einmalig Owner anlegen, dann läuft alles |
| `relation "apps" does not exist` | init.sql nicht gelaufen | Postgres-Volume war nicht leer beim ersten Start. `docker compose down -v` und neu starten |
| Block-Drag in Blockly hakt | Alter Build im Browser-Cache | Hard-Reload (Strg+Shift+R) |
| n8n-Bootstrap ignoriert Aktualisierungen | Marker-File `.fwt-imported` existiert | `docker compose exec n8n rm /home/node/.n8n/.fwt-imported` und Container restart |

---

## 15. Hardening (vor Produktiv-Einsatz)

- [ ] `N8N_USER_MANAGEMENT_DISABLED` auf `false` setzen, Owner-Account mit starkem Passwort anlegen
- [ ] `N8N_ENCRYPTION_KEY` auf einen Random-String mit ≥32 Zeichen setzen
- [ ] Postgres-Passwort drehen (`POSTGRES_PASSWORD` + `n8n/credentials.json`)
- [ ] n8n-UI nur über VPN / Reverse-Proxy mit Auth zugänglich machen
- [ ] CORS auf konkrete Hosts beschränken (kein `*`)
- [ ] TLS via Caddy + Let's Encrypt
- [ ] Postgres-Backup automatisieren (Cron + Retention)
- [ ] Read-only DB-User für Reporting / BI

---

## 16. Update-Workflow

Wenn neue Workflows hinzukommen oder bestehende geändert werden:

```bash
# Code aktualisieren
cd /opt/flexworktwin
git pull   # oder neu rsyncen

# Marker entfernen, damit n8n beim Restart die Workflows neu importiert
docker compose exec n8n rm -f /home/node/.n8n/.fwt-imported

# Container neu starten
docker compose restart n8n

# Frontends neu bauen, falls Code geändert
npm install
npm run build
```

> Für ein produktives Update-Verfahren empfiehlt sich ein eigenes Deploy-Skript, das Postgres-Backup → Stack-Update → Rauchtest in einer Pipeline ausführt. Das ist ein eigener Schritt, sobald wir vom Test-Setup auf Produktion gehen.
