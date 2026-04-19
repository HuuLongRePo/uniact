# TEACHER CROSS-CLASS ACTIVITY MANAGEMENT FOLLOW-UP TASKS

Status: active requirement capture from latest user instruction

## New confirmed operational requirement
Teacher can:
- choose classes that are not directly managed by them,
- choose students inside those classes,
- then gain activity-related operational management over the selected students for that activity,
  including attendance, evaluation, and related activity operations.

This is not the same as globally owning those classes. It is an **activity-scoped operational authority** model.

## Core semantic model
### Distinguish 3 layers clearly
1. **Managed classes**
   - teacher has normal full management rights by class assignment.

2. **Activity-selected classes/students**
   - teacher gains operational rights only for the context of that activity.
   - examples: attendance, evaluation, participation handling, activity communication.

3. **Unrelated classes/students**
   - no access or only minimal visibility.

## P0 - Activity-scoped authority implementation model
Need to define and implement how the system proves that a teacher may operate on a student because:
- the student was selected directly for the activity,
- or the student's class was selected for the activity,
- even if that class is not a normally managed class of that teacher.

## P0 - CRUD and scope model implications
Teacher activity create/edit must support:
- selecting cross-class targets,
- selecting direct students,
- seeing why each target is included,
- maintaining a clear distinction between mandatory, voluntary, and globally-open scope.

## P0 - Operational rights implications
Teacher should be able to manage selected activity participants across those classes for that activity:
- attendance,
- evaluation,
- participation review,
- activity-scoped student operations,
- possibly communication/notifications tied to that activity.

## P1 - Guard/route implications
Audit all routes that currently assume:
- teacher can only manage students in assigned classes,
- teacher ownership is class-based rather than activity-based.

Likely affected areas:
- teacher students/activity participant routes,
- attendance routes,
- evaluation routes,
- activity detail and participant management,
- preview and visibility routes.

## P1 - Audit and reason model
Because this is cross-class access, auditability matters.
Consider structured evidence for why teacher can act:
- managed_class,
- activity_class_scope,
- activity_student_scope,
- admin_override.

## Recommended next execution order
1. Capture this as a canonical business rule.
2. Extend target model to include direct students + activity-scoped authority.
3. Refactor guards/routes from class-only assumptions to activity-scoped access where intended.
4. Add regression for teacher attendance/evaluation on selected students from non-managed classes.
