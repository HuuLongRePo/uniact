# 📚 Tài Liệu Đề Tài - UniAct

> Lưu ý: đây là nhánh tài liệu học thuật và thuyết minh đề tài. Không dùng file này làm nguồn sự thật cho task queue, script chạy dự án hay trạng thái sửa lỗi hiện tại. Khi cần tài liệu vận hành repo, ưu tiên [../CANONICAL_DOCS.md](../CANONICAL_DOCS.md).

> Hệ thống Quản lý Hoạt động Ngoại khóa & Điểm Rèn Luyện  
> **Phiên bản tài liệu: v2.3.0**  
> **Cập nhật: 12/04/2026**

---

## 📖 Danh Mục Tài Liệu

### 🎯 Báo Cáo Chính Thức (00-12)

| # | File | Nội dung |
|---|------|----------|
| 00 | [MỤC LỤC](00-MUC-LUC.md) | Index tổng hợp |
| 01 | [TRANG BÌA](01-TRANG-BIA.md) | Thông tin đề tài |
| 02 | [TÓM TẮT](02-TOM-TAT.md) | Executive summary |
| 03 | [MỞ ĐẦU](03-MO-DAU.md) | Giới thiệu, Mục tiêu |
| 04 | [CƠ SỞ LÝ THUYẾT](04-CO-SO-LY-THUYET.md) | Nền tảng kỹ thuật |
| 05 | [PHÂN TÍCH](05-PHAN-TICH-HE-THONG.md) | Yêu cầu, Use cases |
| 06 | [THIẾT KẾ](06-THIET-KE-HE-THONG.md) | Database, API, UI |
| 07 | [CÔNG NGHỆ](07-CONG-NGHE-THUC-HIEN.md) | Tech stack, Tools |
| 08 | [KẾT QUẢ](08-KET-QUA-DANH-GIA.md) | Testing, Evaluation |
| 09 | [KẾT LUẬN](09-KET-LUAN.md) | Conclusion, Future |
| 10 | [TÀI LIỆU TK](10-TAI-LIEU-THAM-KHAO.md) | References |
| 11 | [PHỤ LỤC](11-PHU-LUC.md) | Appendixes ✅ Updated |
| 12 | [THUYẾT TRÌNH](12-KE-HOACH-THUYET-TRINH.md) | Presentation plan |

### 📝 Tài Liệu Kỹ Thuật (v2.2.0)

| File | Mô tả | Lines | Status |
|------|-------|-------|--------|
| **[PERMISSIONS_AND_BUSINESS_RULES](PERMISSIONS_AND_BUSINESS_RULES.md)** | Quy tắc nghiệp vụ toàn diện | **1,400+** | ⭐ **NEW** |
| **[LOGIC_MOI_QUAN_HE](LOGIC_MOI_QUAN_HE.md)** | Relationship logic & ERD | **500+** | ⭐ **NEW** |
| **[NHAT-KY-THUC-HIEN](NHAT-KY-THUC-HIEN.md)** | Timeline chi tiết 6 giai đoạn | **500+** | ✅ **Updated** |
| [HUONG-DAN-SU-DUNG](HUONG-DAN-SU-DUNG.md) | User manual | 300+ | ✅ |
| [HUONG-DAN-CHUYEN-DOI](HUONG-DAN-CHUYEN-DOI.md) | MD→Word guide | 200+ | ✅ |

---

## ⭐ Điểm cập nhật v2.3.0 (12/04/2026)

### 1. PERMISSIONS_AND_BUSINESS_RULES.md (1,400+ dòng)

**Nội dung toàn diện:**
- 📊 Permission Matrix: Admin/Teacher/Student × 15 operations
- 👁️ Visibility Rules: Teacher xem tất cả (tránh trùng lịch), Student lọc theo lớp
- ⚠️ Conflict Detection: Location overlap + Schedule warnings
- 📋 6 Business Scenarios đầy đủ (Create → Approve → Register → Attend)
- ✅ 6 Edge Cases (Validation, Race conditions, Safety checks)
- 🛠️ Implementation Guide (Schema, APIs, Components, Tests)

**Tích hợp:** Chương 3 (Phân tích) + Chương 4 (Thiết kế) + Phụ lục B

### 2. LOGIC_MOI_QUAN_HE.md (500+ dòng)

**Nội dung:**
- 📊 Sơ đồ quan hệ: Teacher-Activities-Classes-Students-Participations
- 🔗 4 Relationships chi tiết với FK, junction tables
- 🎯 Max Participants logic (dropdown 30-1000 + custom)
- 🔍 7 Query patterns thường dùng
- 🏗️ Performance indexes

**Tích hợp:** Chương 4 (Thiết kế DB) + Phụ lục C

### 3. Đồng bộ với trạng thái hệ thống hiện tại

**Cập nhật trọng tâm:**
- ✅ Điều chỉnh lại mô tả workflow approval theo trạng thái canonical hiện tại
- ✅ Bổ sung rõ student discovery/register/cancel flow và phạm vi áp dụng theo lớp
- ✅ Cập nhật narrative từ “thiết kế dự kiến” sang “hệ thống đã có phần hiện thực đáng kể, vẫn đang tiếp tục hoàn thiện”
- ✅ Đồng bộ lại hướng phát triển theo roadmap thực tế: harden backbone, cleanup contract, kiểm thử hồi quy, sẵn sàng cho milestone release lớn hơn

**Tích hợp:** Chương 3 (Phân tích), Chương 4 (Thiết kế), Chương 6 (Kết quả), Chương 7 (Kết luận)

---

## 📦 Mapping: MD → Word Report

| Chương | Source Files | Ghi chú |
|--------|--------------|---------|
| Chương 1 | 03-MO-DAU | Intro |
| Chương 2 | 04-CO-SO-LY-THUYET | Theory |
| Chương 3 | 05-PHAN-TICH + **PERMISSIONS** ⭐ | Analysis + Business rules |
| Chương 4 | 06-THIET-KE + **LOGIC_MQH** ⭐ | Design + DB relationships |
| Chương 5 | 07-CONG-NGHE | Tech stack |
| Chương 6 | 08-KET-QUA + **NHAT-KY** ⭐ | Results + Timeline |
| Chương 7 | 09-KET-LUAN | Conclusion |
| Phụ lục A | 11-PHU-LUC (A) | Schema, APIs |
| Phụ lục B | 11-PHU-LUC (B) + **PERMISSIONS** | Business rules |
| Phụ lục C | 11-PHU-LUC (C) + **LOGIC_MQH** | Relationships |
| Phụ lục D-F | 11-PHU-LUC (D-F) | Tests, Screenshots |

**Chi tiết**: [HUONG-DAN-CHUYEN-DOI.md](HUONG-DAN-CHUYEN-DOI.md)

---

## 📈 Thống Kê

**Tổng quan:**
- 19 MD files
- bộ tài liệu học thuật + kỹ thuật bổ trợ cho đề tài
- phản ánh trạng thái hệ thống ở mức học thuật, không thay thế tài liệu vận hành ở root/docs

**Growth v2.2.0:**
- +2,400 lines (+40%)
- +3 major documents
- Comprehensive business documentation

---

## ✅ Checklist

### Tài liệu
- [x] 00-12: All formal docs
- [x] PERMISSIONS: 1,400+ lines ⭐ NEW
- [x] LOGIC_MQH: 500+ lines ⭐ NEW  
- [x] NHAT-KY: Updated ✅
- [x] 11-PHU-LUC: Integrated ✅
- [x] README: Complete index ✅

### Integration
- [x] Cross-references verified
- [x] Duplicates removed
- [x] Formatting consistent

---

## 🚀 Version History

| Ver | Date | Highlights |
|-----|------|-----------|
| v2.3.0 | 12/04/2026 | Đồng bộ với trạng thái hệ thống và hướng phát triển hiện tại |
| v2.2.0 | 14/01/2026 | **Permissions & Business Logic** ⭐ |
| v2.1.2 | 13/01/2026 | UI/UX enhancements |
| v2.0 | 01/2026 | Production ready |
| v1.0 | 12/2025 | Initial docs |

---

**Status:** ✅ Tài liệu học thuật đã được đồng bộ lại theo hệ thống hiện tại  
**Next:** tiếp tục cập nhật theo các milestone release lớn và hoàn thiện số liệu đánh giá thực nghiệm khi chốt hệ thống
