# Next-Step Executor Prompt

```text
Ban dang tiep quan du an UniAct trong trang thai da duoc clean mot phan backbone P0. Nhiem vu cua ban khong phai brainstorm, ma phai:

1. Hieu nhanh state hien tai cua repo.
2. Xac dinh chinh xac viec nao nen lam tiep theo.
3. Thuc hien ngay batch tiep theo co ROI cao nhat.
4. Tu kiem chung bang test/regression focused.

BAT BUOC:
- Doc va dung chung voi: BUSINESS_DECISIONS.md, BUSINESS_QUESTIONS.md, SYSTEM_AUDIT.md.
- Khong chi phan tich. Phai sua code, them regression, chay verify.
- Uu tien drift that su gay lech contract/business, khong uu tien lam dep be mat.
- Moi thay doi phai map duoc: business rule -> DB/query -> API -> UI/helper/test.
- Neu co legacy compatibility thi duoc giu, nhung canonical flow phai ro rang va khong tao them drift moi.

TRANG THAI HIEN TAI CAN COI LA SU THAT:
- Approval workflow canonical la: status='draft' giu nguyen khi submit, approval_status='requested' -> approved/rejected, va khi approved thi activity.status='published'.
- Teacher operational access da duoc mo cho attendance, QR, evaluate, files, va activities list qua scope=operational.
- Student registration conflict da doi sang rule "trung gio bat dau", UI student da co flow override theo signal backend.
- Nhieu route/page legacy da duoc redirect hoac gom ve canonical flow.
- Helper/UAT da duoc clean mot phan, nhung van phai tiep tuc xem con route chet, selector drift, hay contract drift nao khong.

CACH CHON VIEC TIEP THEO:
- Quet nhanh nhung diem sau:
  1. approval history / audit trail / timeline co con dung semantics cu hay khong
  2. helper UAT con tro vao route khong ton tai khong
  3. API compatibility wrappers co dang leak semantics legacy vao canonical path khong
  4. docs noi bo co con day pending_approval, pending, owner-only, dead route nao khong
- Chon 1 batch duy nhat co signal cao nhat va sua tron goi.

THU TU THUC THI BAT BUOC:
1. Quet bang rg de tim drift thuc su.
2. Chot 1 batch co ROI cao nhat.
3. Sua code va docs lien quan neu can.
4. Them regression test nho gon nhung khoa dung loi vua sua.
5. Chay focused test bundle.
6. Bao cao ngan gon:
   - da sua gi
   - tai sao day la viec nen lam tiep theo
   - test nao da chay, pass/fail ra sao
   - buoc tiep theo hop ly nhat sau batch nay

TIEU CHI THANH CONG:
- Canonical contract ro hon sau thay doi.
- Giam drift giua business decisions va he thong that.
- Khong pha backward compatibility can thiet.
- Co test de tranh tai phat.
```
