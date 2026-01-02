# 🔒 Deploy Sikkerhetsfiks for Search Path

**Viktig sikkerhetsfiks som må deployes nå!**

---

## Steg 1: Åpne Supabase SQL Editor

1. Gå til: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql
2. Klikk **"New Query"**

---

## Steg 2: Kjør Sikkerhetsfixen

1. Åpne filen: `supabase/migrations/20260102_fix_search_path_security.sql`
2. Kopier **HELE** innholdet (Cmd+A → Cmd+C)
3. Lim inn i SQL Editor (Cmd+V)
4. Klikk **"Run"** (eller trykk Cmd+Enter)

⏱️ Dette tar ~5 sekunder å kjøre.

---

## Hva Fikses?

Denne migrasjonen legger til `SET search_path = ''` til alle 17 database-funksjoner for å forhindre:
- Search path injection attacks
- Potensielle privilege escalation-sårbarheter

### Berørte Funksjoner:
- ✅ update_updated_at_column
- ✅ verify_api_key, generate_api_key
- ✅ track_usage, refresh_daily_usage_summary
- ✅ create_trial_subscription, upgrade_subscription, check_usage_quota
- ✅ generate_invoice_number, create_monthly_invoice, mark_invoice_paid
- ✅ register_widget_instance, update_widget_stats
- ✅ create_notification_for_org, mark_notification_read, mark_all_notifications_read
- ✅ notify_usage_quota_warning

---

## Verifiser Etter Deploy

Gå til: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/reports/database-health

**Forventet resultat:**
- ✅ Alle "Function Search Path Mutable" advarsler skal være borte

---

## 🎉 Ferdig!

Database-funksjonene er nå sikret mot search path-angrep.
