# LIGHT/DARK COLOR SYSTEM PROPOSAL (UNIACT)

Ngay cap nhat: 2026-05-05  
Pham vi: De xuat he thong mau va contrast policy. Khong sua component o tai lieu nay.

## 1) Audit nhanh nhung diem de kho nhin nhat

Nhom rui ro cao:
- Nen page va card gan nhau qua muc trong dark mode -> mat cap bac.
- Text secondary/muted tren surface toi chua du contrast.
- Border divider qua nhe, kho thay bien card/table/form.
- Button secondary/ghost trong dark mode giong text block, mat kha nang nhan dien thao tac.
- Input placeholder va help text bi chim.
- Badge status (warning/success/error) dung mau sat nen -> kho scan nhanh.
- Toast/alert tren mobile de bi hoa vao nen neu khong co border/outline ro.
- Sidebar/navbar dark gradient dep nhung de lam text icon bi "mo" neu mau chu khong du sang.
- Chart color palette light mode mang sang dark mode gay loe/chim (line legend, tooltip text).
- Focus ring khong du ro tren dark background.

## 2) Bo token mau de xuat (co the ap dung ngay)

### 2.1 Core semantic tokens

| Token | Light | Dark | Vai tro |
|---|---|---|---|
| `--ui-bg-page` | `#F4F7FB` | `#060B16` | Nen tong page |
| `--ui-bg-surface` | `#FFFFFF` | `#0F172A` | Card/mac dinh |
| `--ui-bg-elevated` | `#F8FAFC` | `#16233A` | Card noi bat |
| `--ui-bg-muted` | `#EEF2F7` | `#1E2D48` | Khu phu/section |
| `--ui-text-strong` | `#0F172A` | `#F8FAFC` | Tieu de/chu chinh |
| `--ui-text-default` | `#334155` | `#D6E1F0` | Noi dung mac dinh |
| `--ui-text-muted` | `#64748B` | `#A7B8CD` | Meta/subtext |
| `--ui-text-disabled` | `#94A3B8` | `#6E829F` | Disabled |
| `--ui-border-default` | `#D7DEE8` | `#425674` | Border chinh |
| `--ui-border-soft` | `#E6EBF2` | `#2D3D57` | Divider mem |
| `--ui-focus-ring` | `#2563EB` | `#60A5FA` | Focus keyboard |

### 2.2 Action tokens

| Token | Light | Dark | Vai tro |
|---|---|---|---|
| `--ui-action-primary-bg` | `#1D4ED8` | `#3B82F6` | Nut chinh |
| `--ui-action-primary-hover` | `#1E40AF` | `#2563EB` | Hover |
| `--ui-action-primary-text` | `#F8FAFC` | `#F8FAFC` | Text nut chinh |
| `--ui-action-secondary-bg` | `#FFFFFF` | `#111C32` | Nut phu |
| `--ui-action-secondary-text` | `#0F172A` | `#E5EEF9` | Text nut phu |
| `--ui-action-secondary-border` | `#CBD5E1` | `#4A607F` | Border nut phu |
| `--ui-action-ghost-hover` | `#EAF1FF` | `#223552` | Hover ghost |
| `--ui-action-danger-bg` | `#DC2626` | `#EF4444` | Nut nguy hiem |
| `--ui-action-danger-text` | `#FFF1F2` | `#FFF1F2` | Text danger |

### 2.3 Status tokens

| Token | Light | Dark | Vai tro |
|---|---|---|---|
| `--ui-info-bg` | `#E8F1FF` | `#1A2F4F` | Info badge/alert |
| `--ui-info-text` | `#1E40AF` | `#BFDBFE` | Info text |
| `--ui-success-bg` | `#EAFBF1` | `#173728` | Success badge/alert |
| `--ui-success-text` | `#166534` | `#BBF7D0` | Success text |
| `--ui-warning-bg` | `#FFF7E8` | `#3B2A12` | Warning badge/alert |
| `--ui-warning-text` | `#92400E` | `#FDE68A` | Warning text |
| `--ui-error-bg` | `#FEECEC` | `#3F1C24` | Error badge/alert |
| `--ui-error-text` | `#B91C1C` | `#FECACA` | Error text |

## 3) Quy tac contrast bat buoc

- Text thuong: contrast >= `4.5:1`.
- Text lon (>= 18pt hoac >= 14pt bold): contrast >= `3:1`.
- Icon chuc nang tren button/surface: >= `3:1`.
- Border interactive state (focus/active): >= `3:1` voi nen xung quanh.

Checklist pass/fail:
- [ ] Header + body text card dark mode doc ro tren man laptop va mobile.
- [ ] Input placeholder khong duoc nho hon muc muted policy.
- [ ] Button secondary dark mode nhin la biet click duoc.
- [ ] Toast/alert co border + shadow du de tach khoi nen.
- [ ] Chart tooltip text va legend khong bi chim.

## 4) Do/Don't cho team UI

Do:
- Dung semantic token, khong goi truc tiep mau hex trong component.
- Tach ro 4 cap: page / surface / elevated / muted.
- Luon co focus ring ro cho keyboard navigation.
- Dung status palette theo token thay vi tu do chon mau.

Don't:
- Khong dung `text-slate-400` tren `bg-slate-900` cho noi dung chinh.
- Khong dung border qua mo (`opacity < 30%`) cho card quan trong.
- Khong tai su dung cung mot mau cho text va border interactive.
- Khong "copy/paste palette light" sang dark mode.

## 5) 10 diem de loi nhat can theo doi dai han

1. Placeholder/input help text trong dark mode.
2. Button secondary/ghost o toolbar.
3. Card KPI dashboard co so lieu mau nong.
4. Badge warning tren nen am hieu.
5. Table row hover + selected state.
6. Sidebar item active vs inactive.
7. Toast stack tren mobile (che thao tac).
8. Modal overlay + modal border contrast.
9. Chart line mau vang/cam tren nen toi.
10. Disabled state qua mo den muc khong doc duoc.

## 6) Ke hoach trien khai theo batch lon

### Batch A - Token Foundation (P0)
- Pham vi: `globals.css` + theme variables.
- Muc tieu: map day du token light/dark + focus + status.
- DoD: toan bo component co the dung token moi ma khong can hex inline.
- Risk: mot so page cu co class utility override token.
- Verify: lint CSS + visual smoke 10 trang tan suat cao.

### Batch B - Dashboard Visual Recovery (P0)
- Pham vi: dashboard cards/KPI/charts/header.
- Muc tieu: ro cap bac, contrast manh, bo cuc de scan nhanh.
- DoD: KPI va CTA doc ro trong 3-5 giay o dark mode.
- Risk: charts can tune rieng mau line/legend.
- Verify: regression dashboard tests + visual check dark/light.

### Batch C - High-frequency Actor Surfaces (P1)
- Pham vi:
  - Student: dashboard/activities/check-in/notifications/scores.
  - Teacher: dashboard/activities/attendance/qr/notifications.
  - Admin: dashboard/activities/approvals/reports.
- DoD: khong con text/button bi chim tren man hinh dark mode.
- Risk: style drift giua page cu va page moi.
- Verify: page tests theo cum actor + manual mobile smoke.

### Batch D - Charts, Alerts, Forms Deep Pass (P1)
- Pham vi: charts, form fields, status alerts, toast, modal.
- DoD: color language nhat quan toan app.
- Risk: regressions nho o state hover/disabled.
- Verify: visual checklist + regression tests nhom form/notification.

## 7) Kien truc mau de xuat chot

Phuong an de xuat: **"Deep Navy + Electric Blue + Emerald Accent"**
- Ly do:
  - Navy dam tao nen toi on dinh, it moi mat.
  - Blue la action color manh, de thay, dung cho thao tac chinh.
  - Emerald cho success va KPI tich cuc, tao cam giac he thong "song".
  - Warning/Error dung amber/rose du contrast, khong gay choi.
- Ket qua mong doi:
  - Dong bo light/dark theo token semantic.
  - Dep hon, hien dai hon, nhung van uu tien doc ro va thao tac nhanh.

