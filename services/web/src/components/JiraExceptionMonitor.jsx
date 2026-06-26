'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AdminPanel, { adminSections } from './AdminPanel';
import { useBranding, backgroundStyle } from './branding';

// ===================================================================
//  مراقب جيرا — لوحة الاستثناءات (واجهة) · ثنائية اللغة AR/EN
//  نمط البيت (Frappe/ERPNext). تتغذّى بالكامل من مسارات /api.
// ===================================================================

const C = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  border: 'var(--c-border)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  green: '#1f7a4d',
  red: '#e03636',
  amber: '#cb8a14',
  blue: '#2490ef',
  purple: '#7c4dff',
};

// ألوان أنواع الاستثناءات وحالات SLA (مستقلة عن اللغة)
const EXC_COLORS = { overdue: C.red, stagnant: C.amber, review: C.blue, unassigned: C.purple };
const SLA_COLORS = { breached: C.red, at_risk: C.amber, on_track: C.green };

// ------------------------------------------------------------------- i18n
const DICT = {
  ar: {
    dir: 'rtl',
    locale: 'ar-EG-u-nu-latn',
    other: 'English',
    title: 'مراقب جيرا — لوحة الاستثناءات',
    subtitle: 'ما يحتاج تدخّل المدير فقط — تحديث تلقائي كل بضع دقائق',
    tabOperational: 'تشغيلي',
    tabManagerial: 'إداري',
    tabAdmin: 'الإدارة',
    account: 'حسابي',
    logout: 'خروج',
    tzLabel: 'المنطقة الزمنية', tzAuto: 'تلقائي (حسب جهازك)', tzShownIn: 'الأوقات معروضة بتوقيت',
    refresh: 'تحديث', collapseAll: 'طي الكل', expandAll: 'فتح الكل',
    syncNow: 'مزامنة', syncStarted: 'بدأت المزامنة في الخلفية… حدّث بعد قليل', syncBusy: 'المزامنة قيد التشغيل بالفعل', syncFail: 'تعذّرت المزامنة',
    navDashboard: 'لوحة المعلومات', navOps: 'العمليات', navMgmt: 'التحليلات', navAdmin: 'الإدارة', navAccount: 'حسابي', projectTickets: 'تذاكر المشروع',
    scrDashboard: 'المؤشرات', hDashboard: 'أهم مؤشرات الأداء في لقطة واحدة. تظهر المؤشرات أو تُخفى حسب صلاحيات دورك.', noKpi: 'لا توجد مؤشرات متاحة لدورك.',
    dragHint: 'اسحب البطاقات لإعادة ترتيبها', resetLayout: 'إعادة الترتيب الافتراضي',
    scrOverview: 'نظرة عامة', scrKpi: 'المؤشرات العامة', scrCycle: 'زمن الدورة', scrSecurity: 'إعدادات الحساب',
    menuShow: 'إظهار القائمة', menuHide: 'إخفاء القائمة',
    searchPlaceholder: 'بحث في الشاشات والتذاكر…', recent: 'عمليات البحث الأخيرة', screensGroup: 'الشاشات', ticketsGroup: 'التذاكر', noResults: 'لا نتائج', clearHistory: 'مسح',
    lastSync: 'آخر مزامنة', lastSyncTip: 'وقت آخر مزامنة مع جيرا. تتم المزامنة تلقائياً عند الدخول، ويمكنك تشغيلها يدوياً بزرّ «مزامنة جيرا». النقطة الخضراء الوامضة تعني أن البيانات حيّة.',
    offlineBadge: 'دون اتصال', offlineTip: 'لا يوجد اتصال بالشبكة — تُعرَض آخر بيانات محفوظة على جهازك (للقراءة فقط). ستتحدّث تلقائياً عند عودة الاتصال.',
    never: 'لا يوجد',
    cOverdue: 'متأخر عن الاستحقاق',
    cStagnant: 'راكد > 3 أيام',
    cReview: 'مراجعة متأخرة',
    cUnassigned: 'بدون مسؤول',
    exceptions: 'الاستثناءات',
    from: 'من',
    to: 'إلى',
    clear: 'مسح',
    all: 'الكل',
    searchTickets: 'بحث: مفتاح / عنوان / مسؤول',
    basketTitle: 'سلّة البحث',
    basketPlaceholder: 'أضف مفاتيح تذاكر (مثل GR2-36، GR2-40)',
    basketAdd: 'أضف للسلّة',
    basketClear: 'تفريغ السلّة',
    basketHint: 'ابحث عن مجموعة تذاكر معاً — أضِف مفاتيح جديدة دون مسح السابقة، ويعرض الجدول تذاكر السلّة فقط.',
    basketCount: (n) => `${n} في السلّة`,
    basketAddRow: 'أضِف هذه التذكرة للسلّة',
    basketRemoveRow: 'أزِل من السلّة',
    showDone: 'إظهار المنجزة',
    showDoneHint: 'تضمين التذاكر المنجزة (المغلقة) ضمن القائمة، إضافةً إلى المفتوحة.',
    fAssignee: 'المسؤول',
    fProject: 'المشروع',
    fPriority: 'الأهمية',
    fStatus: 'الحالة',
    fLabel: 'الوسم',
    noLabel: 'بدون وسم',
    showing: (x, y) => `عرض ${x} من ${y}`,
    exportCsv: 'تصدير CSV',
    perPage: 'لكل صفحة',
    pageOf: (x, y) => `صفحة ${x} من ${y}`,
    rowsPerPage: 'عدد الصفوف',
    prev: 'السابق',
    next: 'التالي',
    actions: 'إجراءات',
    act: '⋯',
    comment: 'تعليق',
    aiSuggest: '✨ اقتراح بالذكاء', aiThinking: '… يفكّر',
    assign: 'إسناد',
    editFields: 'تعديل الحقول',
    commaSep: 'افصل بفواصل',
    transition: 'نقل الحالة',
    linkDep: 'اعتمادية', relBlockedBy: 'هذه التذكرة تعتمد على تذكرة أخرى', relBlocks: 'تذاكر أخرى تعتمد على هذه التذكرة', otherKeyPh: 'مفتاح التذكرة الأخرى، مثل GR2-36', linkHint: 'يُنشئ رابط اعتمادية في جيرا. بعد المزامنة يظهر في «اختناقات الاعتمادية».',
    linkCurrent: 'الاعتماديات الحالية', linkDependsOn: 'تعتمد على', linkRequiredBy: 'يعتمد عليها', removeWord: 'إلغاء', unlinkReasonPh: 'سبب الإلغاء (إلزامي)', unlinkReasonReq: 'يجب كتابة سبب الإلغاء قبل إتمامه — يُسجَّل للمراجعة.',
    send: 'إرسال',
    apply: 'تطبيق',
    unassign: 'إلغاء الإسناد',
    pick: 'اختر…',
    actDone: 'تم بنجاح',
    close: 'إغلاق',
    history: 'السجل', subtasksL: 'المهام الفرعية', commentsL: 'التعليقات', changelogL: 'سجل التغييرات', loadMore: 'تحميل المزيد', noHistory: 'لا يوجد',
    followup: 'المتابعة',
    acknowledge: 'إقرار (رأيتها/أتابعها)',
    acked: 'مُقَرّ',
    snoozeUntil: 'تأجيل حتى',
    owner: 'المالك',
    rootCause: 'السبب الجذري',
    noteL: 'ملاحظة',
    hideSnoozed: 'إخفاء المؤجَّلة',
    hideAcked: 'إخفاء المُقَرّة',
    snoozed: 'مؤجَّل',
    saveFollowup: 'حفظ المتابعة',
    rc: { blocked: 'معطّل', waiting_client: 'بانتظار العميل', under_resourced: 'نقص موارد', dependency: 'اعتمادية', scope_change: 'تغيّر نطاق', other: 'أخرى' },
    thKey: 'المفتاح',
    thSummary: 'الملخّص',
    thStatus: 'الحالة',
    thPriority: 'الأولوية',
    thAssignee: 'المسؤول',
    hierTitle: 'شجرة التذاكر', hierEmpty: 'لا توجد تذاكر تابعة لهذه التذكرة.',
    thCreator: 'المُنشئ',
    thLastActor: 'آخر تحديث',
    thDue: 'الاستحقاق',
    thDays: 'أيام بالحالة',
    thReasons: 'الأسباب',
    thType: 'نوع العمل',
    fType: 'نوع العمل',
    allTickets: 'كل التذاكر المفتوحة',
    hAllTickets: 'كل التذاكر غير المنجَزة (للمتابعة مع الفريق) — ليست المُستثناة فقط. صنّفها حسب المسؤول أو المشروع أو النوع، واستخدم زر ⋯ للإجراء والمتابعة.',
    noTickets: 'لا تذاكر مفتوحة',
    noExceptions: 'لا استثناءات 🎉',
    workload: 'أعباء الفريق — أداة توازن، لا محاسبة فردية',
    overdueSuffix: (n) => ` (${n} متأخر)`,
    sTotal: 'إجمالي التذاكر',
    sOpen: 'مفتوحة',
    sDone: 'منجزة',
    sBreached: 'متجاوزة SLA',
    sAvgCycle: 'متوسط زمن الدورة (يوم)',
    sOnTime: 'التسليم في الموعد',
    sOnTimeHint: 'نسبة التذاكر المنجزة قبل/في تاريخ استحقاقها (ضمن نافذة الفترة المختارة). كلما ارتفعت كان الالتزام أفضل.',
    sSlaCompliance: 'امتثال SLA',
    sSlaComplianceHint: 'نسبة التذاكر الخاضعة لـSLA التي لم تتجاوز المهلة (مفتوحة أو منجزة في الموعد).',
    sNetFlow: 'صافي التدفّق (مُنشأ−مُنجز)',
    sNetFlowHint: 'الفرق بين المُنشأة والمُنجزة خلال الفترة. قيمة موجبة تعني أن المتراكم (Backlog) يتضخّم.',
    sUnassignedWait: 'متوسط انتظار بلا مسؤول',
    sUnassignedWaitHint: 'متوسط عمر التذاكر المفتوحة التي لم تُسنَد بعد — يقيس سرعة التقاط الجديد.',
    trend: 'اتجاه الاستثناءات — آخر 30 يوماً',
    chartLines: 'خطوط', chartArea: 'مساحات', chartBars: 'أعمدة',
    trendEmpty: 'لا لقطات اتجاه بعد — تتراكم يومياً مع كل مزامنة.',
    trendCollecting: (n) => `الاتجاه يتراكم يومياً — يوجد ${n} يوم حتى الآن، يظهر الخط بعد يومين أو أكثر.`,
    windowL: 'النافذة', d30: '30 يوم', d90: '90 يوم', d180: '180 يوم', printReport: '🖨 طباعة التقرير',
    performance: 'تقييم الأداء', perfNote: 'أداة توازن بنّاءة — الدرجات بسياق الحِمل، لا للمحاسبة الفردية.',
    perfAssignees: 'المسؤولون', perfTeams: 'المشاريع', score: 'الدرجة', colResolved: 'منجَز', colLoad: 'الحِمل', colPredict: 'الثبات', windowD: (d) => `آخر ${d} يوم`,
    loadOpen: 'مفتوحة', loadStuck: 'عالقة', loadStuckTip: 'تذاكر قيد التنفيذ لم تتغيّر حالتها منذ أكثر من حدّ الركود (٣ أيام افتراضياً)',
    engagement: 'التفاعل', engHigh: 'متفاعل', engMid: 'متوسط', engLow: 'ضعيف',
    engagementTip: 'نسبة تذاكره المفتوحة التي كان هو آخر مَن عدّلها خلال آخر ٧ أيام — مؤشّر على متابعته وتعليقه عليها.',
    scorecard: 'صحة المشاريع (RAG)',
    health: 'الصحة', onTime: 'متوسط التسليم بالموعد', colOpen: 'مفتوحة', colExc: 'استثناءات', colBreach: 'متجاوز SLA', colCycle: 'متوسط زمن الدورة',
    healthLabel: { red: 'حرِج', amber: 'تحذير', green: 'سليم' },
    flow: 'تدفّق العمل والاختناقات', wipByStage: 'العمل الجاري حسب المرحلة (العدد · متوسط العمر)', agingWip: 'أقدم العناصر العالقة',
    ageDays: 'عمر بالحالة',
    bottleneck: 'الاختناق', bottleneckTag: 'اختناق', items: 'عنصر', avgAgeLabel: 'متوسط العمر',
    stuckLabel: 'عالق', maxAgeLabel: 'أقصى عمر', projectBottlenecks: 'اختناقات المشاريع',
    depBottlenecks: 'الاعتماديات والاختناقات', depHint: 'تذاكر مفتوحة تحجب تذاكر أخرى — معالجتها تفكّ عدّة تذاكر دفعةً واحدة.',
    blocksCount: (n) => `يحجب ${n} ${n === 1 ? 'تذكرة' : 'تذاكر'}`, blockedList: 'المحجوبة', noDeps: 'لا اختناقات اعتمادية',
    depEmptyHint: 'لإظهار الاختناقات: اربط التذاكر في جيرا بعلاقة «Blocks / is blocked by» (تذكرة تحجب أخرى)، ثم اضغط «مزامنة جيرا».',
    depLog: 'سجلّ الاعتماديات المُلغاة', depLogHint: 'كل اعتمادية أُلغيت (تلقائياً أو يدوياً) — مع المنفّذ والتاريخ والسبب، للمراجعة.', dlBlocker: 'كانت تحجب', dlBlocked: 'التذكرة المتوقّفة', dlClearStatus: 'الحالة عند الإلغاء', dlWhen: 'تاريخ الإلغاء', dlRemoved: 'حُذف الرابط', dlKept: 'باقٍ', noDepLog: 'لا سجلّات بعد', dlActor: 'من ألغى', dlReason: 'السبب', dlSource: 'المصدر', srcAuto: 'تلقائي', srcManual: 'يدوي', dlAction: 'إجراء', dlUndo: 'تراجع (إعادة الرابط)',
    wipOverTime: 'تدفّق العمل عبر الزمن', wipOther: 'أخرى', wipEmpty: 'تتراكم لقطات التدفّق يومياً مع كل مزامنة.',
    throughput: 'الإنتاجية والتنبؤ', weeklyDone: 'منجزة أسبوعياً', avgWeekly: 'متوسط أسبوعي',
    weeksUnit: 'أسبوع', byDate: 'بحلول', atPace: 'بالوتيرة الحالية',
    fcOpen: 'استنزاف المفتوحة', fcOverdue: 'استنزاف المتأخرة', fcBreach: 'استنزاف متجاوزات SLA', noForecast: 'يتعذّر التنبؤ (لا إنتاجية كافية)',
    sla: 'تنبؤ SLA',
    thRemaining: 'أيام متبقية',
    noAtRisk: 'لا تذاكر معرّضة 🎉',
    cycleByPriority: 'زمن الدورة حسب الأولوية (يوم)',
    stageResidence: 'زمن البقاء في كل مرحلة (يوم)',
    noStages: 'لا بيانات مراحل كافية بعد.',
    dayUnit: ' يوم',
    loading: '… جارٍ التحميل',
    loadError: 'تعذّر التحميل: ',
    hExceptions: 'التذاكر التي تحتاج تدخّلاً: متأخرة عن الاستحقاق، راكدة (>3 أيام)، مراجعة متطاولة (>يومين)، أو بلا مسؤول. استخدم الفلاتر للتصنيف، و«تصدير CSV» للنتائج، وزر ⋯ للإجراء والمتابعة.',
    hWorkload: 'توزيع التذاكر المفتوحة على الفريق — لموازنة الأحمال لا للمحاسبة الفردية. الشريط الكهرماني يعني وجود متأخرات لدى الشخص.',
    hPerformance: 'درجة 0–100 لكل مسؤول/مشروع من: الالتزام بالموعد (35٪)، زمن الدورة (30٪، الأسرع أعلى)، الموثوقية (20٪، عالقون أقل)، الإنتاجية (15٪). الدرجات نسبية ضمن فريقك وتُقرأ مع عمود «الحِمل». أخضر ≥75 · كهرماني ≥50 · أحمر أقل.',
    hScorecard: 'صحة كل مشروع: أحمر «حرِج»، كهرماني «تحذير»، أخضر «سليم» — محسوبة من نسبة تجاوز SLA وكثافة الاستثناءات. مرتّبة الأسوأ أولاً. «التسليم بالموعد» = نسبة المنجَز قبل تاريخ استحقاقه.',
    hFlow: 'أين يتكدّس العمل: عدد التذاكر المفتوحة في كل مرحلة ومتوسط عمرها فيها. المرحلة الحمراء = الاختناق (تكدّس + هرم). «عالق» = أقدم من عتبة الركود. «اختناقات المشاريع» = أسوأ مرحلة في كل مشروع.',
    hWip: 'تطوّر توزيع العمل الجاري على المراحل يومياً (مساحات متراكمة). ارتفاع الكتلة = تكدّس متزايد؛ اتساع نطاق مرحلة بمرور الوقت = اختناق يتكوّن. تتراكم اللقطات يومياً.',
    hThroughput: 'كم تذكرة تُنجَز أسبوعياً (آخر 12 أسبوعاً) ومتوسطها، ثم تقدير — بالوتيرة الحالية — متى تُستنزف المفتوحة والمتأخرة ومتجاوزات SLA.',
    hTrend: 'تغيّر أعداد الاستثناءات خلال 30 يوماً. بدّل العرض بين مساحات/أعمدة/خطوط. الاتجاه الصاعد = تفاقم. يتراكم يومياً مع كل مزامنة.',
    hSla: 'التذاكر المفتوحة مرتّبة حسب قرب أو تجاوز موعدها وفق SLA الأولوية (عالية 7 · متوسطة 14 · منخفضة 21 يوماً). «متجاوز» أحمر، «معرّض» كهرماني.',
    hCycle: 'متوسط الزمن من إنشاء التذكرة حتى إنجازها حسب الأولوية، وزمن البقاء في كل مرحلة — أقصر أفضل، والأطول قد يشير لاختناق.',
    exc: { overdue: 'متأخر', stagnant: 'راكد', review: 'مراجعة', unassigned: 'بدون مسؤول' },
    slaState: { breached: 'متجاوز', at_risk: 'معرّض للخطر', on_track: 'ضمن المهلة' },
  },
  en: {
    dir: 'ltr',
    locale: 'en-GB',
    other: 'العربية',
    title: 'Jira Monitor — Exceptions Board',
    subtitle: 'Only what needs a manager — auto-refreshed every few minutes',
    tabOperational: 'Operational',
    tabManagerial: 'Managerial',
    tabAdmin: 'Admin',
    account: 'Account',
    logout: 'Log out',
    tzLabel: 'Time zone', tzAuto: 'Auto (your device)', tzShownIn: 'Times shown in',
    refresh: 'Refresh', collapseAll: 'Collapse all', expandAll: 'Expand all',
    syncNow: 'Sync', syncStarted: 'Sync started in background… refresh shortly', syncBusy: 'A sync is already running', syncFail: 'Sync failed',
    navDashboard: 'Dashboard', navOps: 'Operations', navMgmt: 'Analytics', navAdmin: 'Administration', navAccount: 'My Account', projectTickets: 'Project tickets',
    scrDashboard: 'KPIs', hDashboard: 'Key performance indicators at a glance. Tiles show or hide based on your role permissions.', noKpi: 'No KPIs available for your role.',
    dragHint: 'Drag cards to rearrange', resetLayout: 'Reset layout',
    scrOverview: 'Overview', scrKpi: 'KPIs', scrCycle: 'Cycle time', scrSecurity: 'Account settings',
    menuShow: 'Show menu', menuHide: 'Hide menu',
    searchPlaceholder: 'Search screens & tickets…', recent: 'Recent searches', screensGroup: 'Screens', ticketsGroup: 'Tickets', noResults: 'No results', clearHistory: 'Clear',
    lastSync: 'Last sync', lastSyncTip: 'Time of the last Jira sync. Syncs run automatically on entry; you can also run one manually with the “Sync Jira” button. The flashing green dot means data is live.',
    offlineBadge: 'Offline', offlineTip: 'No network connection — showing the last data cached on your device (read-only). It will refresh automatically when you are back online.',
    never: 'never',
    cOverdue: 'Overdue',
    cStagnant: 'Stagnant > 3 days',
    cReview: 'Late review',
    cUnassigned: 'Unassigned',
    exceptions: 'Exceptions',
    from: 'From',
    to: 'To',
    clear: 'Clear',
    all: 'All',
    searchTickets: 'Search: key / summary / assignee',
    basketTitle: 'Search basket',
    basketPlaceholder: 'Add ticket keys (e.g. GR2-36, GR2-40)',
    basketAdd: 'Add to basket',
    basketClear: 'Clear basket',
    basketHint: 'Search a set of tickets together — add new keys without clearing previous ones; the table shows only the basket tickets.',
    basketCount: (n) => `${n} in basket`,
    basketAddRow: 'Add this ticket to the basket',
    basketRemoveRow: 'Remove from basket',
    showDone: 'Show done',
    showDoneHint: 'Include done (closed) tickets in the list, in addition to open ones.',
    fAssignee: 'Assignee',
    fProject: 'Project',
    fPriority: 'Priority',
    fStatus: 'Status',
    fLabel: 'Labels',
    noLabel: 'No label',
    showing: (x, y) => `Showing ${x} of ${y}`,
    exportCsv: 'Export CSV',
    perPage: 'per page',
    pageOf: (x, y) => `Page ${x} of ${y}`,
    rowsPerPage: 'Rows',
    prev: 'Prev',
    next: 'Next',
    actions: 'Actions',
    act: '⋯',
    comment: 'Comment',
    aiSuggest: '✨ AI suggest', aiThinking: '… thinking',
    assign: 'Assign',
    editFields: 'Edit fields',
    commaSep: 'comma-separated',
    transition: 'Transition',
    linkDep: 'Dependency', relBlockedBy: 'This ticket depends on another ticket', relBlocks: 'Other tickets depend on this ticket', otherKeyPh: 'Other ticket key, e.g. GR2-36', linkHint: 'Creates a dependency link in Jira. After a sync it appears in Dependency bottlenecks.',
    linkCurrent: 'Current dependencies', linkDependsOn: 'depends on', linkRequiredBy: 'required by', removeWord: 'Remove', unlinkReasonPh: 'Cancellation reason (required)', unlinkReasonReq: 'A reason is required before cancelling — it is logged for review.',
    send: 'Send',
    apply: 'Apply',
    unassign: 'Unassign',
    pick: 'Select…',
    actDone: 'Done',
    close: 'Close',
    history: 'History', subtasksL: 'Sub-tasks', commentsL: 'Comments', changelogL: 'Change log', loadMore: 'Load more', noHistory: 'none',
    followup: 'Follow-up',
    acknowledge: 'Acknowledge (seen / on it)',
    acked: 'Acked',
    snoozeUntil: 'Snooze until',
    owner: 'Owner',
    rootCause: 'Root cause',
    noteL: 'Note',
    hideSnoozed: 'Hide snoozed',
    hideAcked: 'Hide acked',
    snoozed: 'Snoozed',
    saveFollowup: 'Save follow-up',
    rc: { blocked: 'Blocked', waiting_client: 'Waiting on client', under_resourced: 'Under-resourced', dependency: 'Dependency', scope_change: 'Scope change', other: 'Other' },
    thKey: 'Key',
    thSummary: 'Summary',
    thStatus: 'Status',
    thPriority: 'Priority',
    thAssignee: 'Assignee',
    hierTitle: 'Ticket hierarchy', hierEmpty: 'This ticket has no child tickets.',
    thCreator: 'Reporter',
    thLastActor: 'Last update',
    thDue: 'Due',
    thDays: 'Days in status',
    thReasons: 'Reasons',
    thType: 'Work type',
    fType: 'Work type',
    allTickets: 'All open tickets',
    hAllTickets: 'Every not-done ticket (for team follow-up) — not just exceptions. Slice by assignee, project, or type, and use the ⋯ button to act and follow up.',
    noTickets: 'No open tickets',
    noExceptions: 'No exceptions 🎉',
    workload: 'Team workload — a balancing tool, not individual blame',
    overdueSuffix: (n) => ` (${n} overdue)`,
    sTotal: 'Total tickets',
    sOpen: 'Open',
    sDone: 'Done',
    sBreached: 'SLA breached',
    sAvgCycle: 'Avg cycle time (days)',
    sOnTime: 'On-time delivery',
    sOnTimeHint: 'Share of done tickets resolved on/before their due date (within the selected window). Higher is better.',
    sSlaCompliance: 'SLA compliance',
    sSlaComplianceHint: 'Share of SLA-bound tickets that have not breached (open within SLA, or resolved on time).',
    sNetFlow: 'Net flow (created−resolved)',
    sNetFlowHint: 'Created minus resolved over the period. A positive value means the backlog is growing.',
    sUnassignedWait: 'Avg unassigned wait',
    sUnassignedWaitHint: 'Average age of open tickets that are still unassigned — measures pickup speed.',
    trend: 'Exceptions trend — last 30 days',
    chartLines: 'Lines', chartArea: 'Area', chartBars: 'Bars',
    trendEmpty: 'No trend snapshots yet — they accumulate daily with each sync.',
    trendCollecting: (n) => `Trend is building daily — ${n} day(s) so far; a line appears once there are 2+ days.`,
    windowL: 'Window', d30: '30d', d90: '90d', d180: '180d', printReport: '🖨 Print report',
    performance: 'Performance evaluation', perfNote: 'A constructive balancing tool — scores shown in context of load, not for individual blame.',
    perfAssignees: 'Assignees', perfTeams: 'Projects', score: 'Score', colResolved: 'Resolved', colLoad: 'Load', colPredict: 'Consistency', windowD: (d) => `last ${d} days`,
    loadOpen: 'open', loadStuck: 'stuck', loadStuckTip: 'In-progress tickets unchanged beyond the stagnation threshold (3 days by default)',
    engagement: 'Engagement', engHigh: 'engaged', engMid: 'moderate', engLow: 'low',
    engagementTip: 'Share of their open tickets they were the last to edit within the last 7 days — a signal of follow-up/commenting.',
    scorecard: 'Project health (RAG)',
    health: 'Health', onTime: 'Avg on-time', colOpen: 'Open', colExc: 'Exceptions', colBreach: 'SLA breached', colCycle: 'Avg cycle time',
    healthLabel: { red: 'Critical', amber: 'Warning', green: 'Healthy' },
    flow: 'Flow & bottlenecks', wipByStage: 'WIP by stage (count · avg age)', agingWip: 'Oldest stuck items',
    ageDays: 'Age in status',
    bottleneck: 'Bottleneck', bottleneckTag: 'bottleneck', items: 'items', avgAgeLabel: 'avg age',
    stuckLabel: 'stuck', maxAgeLabel: 'max age', projectBottlenecks: 'Project bottlenecks',
    depBottlenecks: 'Dependencies & bottlenecks', depHint: 'Open tickets blocking others — resolving one unblocks several at once.',
    blocksCount: (n) => `blocks ${n}`, blockedList: 'Blocked', noDeps: 'No dependency bottlenecks',
    depEmptyHint: 'To populate this: link tickets in Jira with "Blocks / is blocked by" (one ticket blocks another), then press "Sync Jira".',
    depLog: 'Cancelled-dependency log', depLogHint: 'Every dependency cleared (auto or manual) — with who, when and why, for review.', dlBlocker: 'Was blocking', dlBlocked: 'Blocked ticket', dlClearStatus: 'Status on clear', dlWhen: 'Cleared at', dlRemoved: 'Link removed', dlKept: 'Kept', noDepLog: 'No records yet', dlActor: 'By', dlReason: 'Reason', dlSource: 'Source', srcAuto: 'Auto', srcManual: 'Manual', dlAction: 'Action', dlUndo: 'Undo (restore link)',
    wipOverTime: 'WIP over time', wipOther: 'Other', wipEmpty: 'Flow snapshots accumulate daily with each sync.',
    throughput: 'Throughput & forecast', weeklyDone: 'Resolved per week', avgWeekly: 'Weekly average',
    weeksUnit: 'weeks', byDate: 'by', atPace: 'At current pace',
    fcOpen: 'Clear open', fcOverdue: 'Clear overdue', fcBreach: 'Clear SLA-breached', noForecast: 'Cannot forecast (not enough throughput)',
    sla: 'SLA forecast',
    thRemaining: 'Days left',
    noAtRisk: 'No tickets at risk 🎉',
    cycleByPriority: 'Cycle time by priority (days)',
    stageResidence: 'Time spent in each stage (days)',
    noStages: 'Not enough stage data yet.',
    dayUnit: ' d',
    loading: '… Loading',
    loadError: 'Failed to load: ',
    hExceptions: 'Tickets needing intervention: overdue, stagnant (>3d), long review (>2d), or unassigned. Use the filters to slice, Export CSV for results, and the ⋯ button to act and follow up.',
    hWorkload: 'Open tickets distributed across the team — a load-balancing tool, not individual blame. An amber bar means that person has overdue items.',
    hPerformance: 'A 0–100 score per assignee/project from: on-time delivery (35%), cycle time (30%, faster is higher), reliability (20%, fewer stuck), throughput (15%). Scores are relative within your team and read alongside the “Load” column. Green ≥75 · amber ≥50 · red below.',
    hScorecard: 'Each project’s health: red “critical”, amber “warning”, green “healthy” — from SLA-breach ratio and exception density. Sorted worst-first. “On-time” = share of work resolved before its due date.',
    hFlow: 'Where work piles up: open ticket count per stage and its average age there. The red stage = the bottleneck (accumulation + ageing). “Stuck” = older than the stagnation threshold. “Project bottlenecks” = the worst stage per project.',
    hWip: 'How open-work distribution across stages evolves daily (stacked area). Rising mass = growing accumulation; a widening band over time = a bottleneck forming. Snapshots accumulate daily.',
    hThroughput: 'How many tickets are resolved per week (last 12) and the average, then an estimate — at the current pace — of when open, overdue, and SLA-breached backlogs will clear.',
    hTrend: 'How exception counts change over 30 days. Toggle area/bars/lines. A rising trend = worsening. Accumulates daily with each sync.',
    hSla: 'Open tickets ordered by how close they are to (or past) their deadline per priority SLA (High 7 · Medium 14 · Low 21 days). “Breached” red, “at risk” amber.',
    hCycle: 'Average time from ticket creation to resolution by priority, plus time spent in each stage — shorter is better; longer may indicate a bottleneck.',
    exc: { overdue: 'Overdue', stagnant: 'Stagnant', review: 'Review', unassigned: 'Unassigned' },
    slaState: { breached: 'Breached', at_risk: 'At risk', on_track: 'On track' },
  },
};

const LangCtx = createContext(null);
const useUI = () => useContext(LangCtx);

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'server error');
  return body.data;
}

// كشف الشاشات الصغيرة (الجوال) لعرض بطاقات بدل الجداول
function useIsMobile(bp = 700) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [bp]);
  return m;
}

// ------------------------------------------------------------------- icons
// أيقونات خطّية أحادية اللون (نمط ERPNext/Feather) — currentColor فتتبع الثيم.
const ICON_PATHS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  barChart: 'M18 20V10M12 20V4M6 20v-6',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z',
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  trendingUp: 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
  trendingDown: 'M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6',
  award: 'M12 15a7 7 0 100-14 7 7 0 000 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  shuffle: 'M16 3h5v5 M4 20L21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5',
  layers: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2',
  refresh: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  cpu: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z M9 9h6v6H9z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3',
  image: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21',
  fileText: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  lock: 'M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z M7 11V7a5 5 0 0110 0v4',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  dashboard: 'M3 3h8v8H3z M13 3h8v5h-8z M13 12h8v9h-8z M3 13h8v8H3z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35',
  briefcase: 'M4 7h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2 M2 12h20',
  cart: 'M9 22a1 1 0 100-2 1 1 0 000 2z M20 22a1 1 0 100-2 1 1 0 000 2z M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20z M2 12h20 M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
};
function Icon({ name, size = 16 }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

// قائمة المناطق الزمنية (IANA) — كل المناطق المدعومة في المتصفّح، مع احتياط لقائمة شائعة.
const TZ_LIST = (() => {
  try {
    if (typeof Intl.supportedValuesOf === 'function') return Intl.supportedValuesOf('timeZone');
  } catch { /* تجاهل */ }
  return ['UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Baghdad', 'Asia/Amman',
    'Asia/Jerusalem', 'Africa/Cairo', 'Africa/Casablanca', 'Asia/Beirut', 'Europe/Istanbul',
    'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Los_Angeles'];
})();
// المنطقة الفعلية للجهاز (عند اختيار «تلقائي»)
function deviceTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

// ------------------------------------------------------------------- لوحة البحث (Ctrl/⌘+K)
const SEARCH_HIST_KEY = 'search_history_v1';
function CommandPalette({ open, onClose, menu, onNavigate, jiraBaseUrl, canTickets, t }) {
  const [q, setQ] = useState('');
  const [tickets, setTickets] = useState([]);
  const [sel, setSel] = useState(0);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const debRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setTickets([]); setSel(0);
    try { setHistory(JSON.parse(localStorage.getItem(SEARCH_HIST_KEY) || '[]')); } catch { setHistory([]); }
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  const screens = useMemo(() => {
    const out = [];
    (menu || []).forEach((cat) => {
      if (cat.solo) { out.push({ type: 'screen', id: cat.targetId, label: cat.label, sub: cat.label, icon: cat.icon }); return; }
      (cat.items || []).forEach((it) => out.push({ type: 'screen', id: it.id, label: it.label, sub: cat.label, icon: it.icon }));
    });
    return out;
  }, [menu]);

  const qlc = q.trim().toLowerCase();
  const screenResults = qlc ? screens.filter((s) => s.label.toLowerCase().includes(qlc) || (s.sub || '').toLowerCase().includes(qlc)) : [];

  useEffect(() => {
    if (!open || !canTickets) { setTickets([]); return undefined; }
    const term = q.trim();
    clearTimeout(debRef.current);
    if (term.length < 2) { setTickets([]); return undefined; }
    debRef.current = setTimeout(async () => {
      try { const d = await fetchJson(`/api/tickets/search?q=${encodeURIComponent(term)}`); setTickets(d.items || []); }
      catch { setTickets([]); }
    }, 220);
    return () => clearTimeout(debRef.current);
  }, [q, open, canTickets]);

  // قائمة موحّدة قابلة للتنقل بالكيبورد
  const items = qlc
    ? [...screenResults, ...tickets.map((tk) => ({ type: 'ticket', ...tk }))]
    : history;
  useEffect(() => { setSel(0); }, [qlc, tickets.length, open]);

  const pushHistory = (item) => {
    const idOf = (x) => (x.type === 'ticket' ? `t:${x.key}` : `s:${x.id}`);
    setHistory((prev) => {
      const next = [item, ...prev.filter((x) => idOf(x) !== idOf(item))].slice(0, 8);
      try { localStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const clearHistory = () => { try { localStorage.removeItem(SEARCH_HIST_KEY); } catch { /* ignore */ } setHistory([]); };

  const activate = (item) => {
    if (!item) return;
    if (item.type === 'screen') { pushHistory(item); onNavigate(item.id); onClose(); }
    else if (item.type === 'ticket') {
      pushHistory(item);
      if (jiraBaseUrl) window.open(`${jiraBaseUrl}/browse/${item.key}`, '_blank', 'noopener');
      onClose();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(items[sel]); }
  };

  if (!open) return null;
  const rowStyle = (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 8, cursor: 'pointer', background: active ? C.bg : 'transparent' });
  const groupLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: C.muted, textTransform: 'uppercase', padding: '8px 10px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  let idx = -1; // مؤشّر مسطّح للعناصر القابلة للتفعيل

  return (
    <div onClick={onClose} className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.35)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div onClick={(e) => e.stopPropagation()} dir="auto" style={{ width: 'min(640px, 92vw)', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 18px 50px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>
          <Icon name="search" size={18} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder={t.searchPlaceholder}
            style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', color: C.text, fontSize: 15, fontFamily: 'inherit' }} />
          <kbd style={{ fontSize: 11, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 6px' }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: '58vh', overflowY: 'auto', padding: 6 }}>
          {!qlc && (
            history.length === 0
              ? <div style={{ padding: 16, color: C.muted, fontSize: 13 }}>{t.searchPlaceholder}</div>
              : <div style={groupLabel}><span>{t.recent}</span><button onClick={clearHistory} style={{ ...ghostBtn, padding: '1px 7px', fontSize: 11 }}>{t.clearHistory}</button></div>
          )}
          {qlc && screenResults.length > 0 && <div style={groupLabel}>{t.screensGroup}</div>}
          {(qlc ? screenResults : history.filter((h) => h.type === 'screen')).map((s) => {
            idx += 1; const here = idx;
            return (
              <div key={`s-${s.id}`} onMouseEnter={() => setSel(here)} onClick={() => activate(s)} style={rowStyle(sel === here)}>
                <Icon name={s.icon || 'list'} size={16} />
                <span style={{ flex: 1, fontSize: 14 }}>{s.label}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{s.sub}</span>
              </div>
            );
          })}
          {qlc && tickets.length > 0 && <div style={groupLabel}>{t.ticketsGroup}</div>}
          {(qlc ? tickets.map((tk) => ({ type: 'ticket', ...tk })) : history.filter((h) => h.type === 'ticket')).map((tk) => {
            idx += 1; const here = idx;
            return (
              <div key={`t-${tk.key}`} onMouseEnter={() => setSel(here)} onClick={() => activate(tk)} style={rowStyle(sel === here)}>
                <Icon name="flag" size={16} />
                <span style={{ fontWeight: 700, fontSize: 13, color: C.blue }}>{tk.key}</span>
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.summary}</span>
                {tk.status && <span style={{ fontSize: 11, color: C.muted }}>{tk.status}</span>}
              </div>
            );
          })}
          {qlc && screenResults.length === 0 && tickets.length === 0 && (
            <div style={{ padding: 16, color: C.muted, fontSize: 13 }}>{t.noResults}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- shell
export default function JiraExceptionMonitor() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [tz, setTz] = useState('auto'); // تفضيل المنطقة الزمنية: 'auto' = حسب الجهاز
  const [screen, setScreen] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState(null);
  const [me, setMe] = useState(null);
  const [menuOpen, setMenuOpen] = useState(true);   // الشريط الجانبي (سطح المكتب)
  const [drawer, setDrawer] = useState(false);       // درج القائمة (الجوال)
  const [collapsedCats, setCollapsedCats] = useState({}); // طي/فتح تصنيفات القائمة
  const [profileOpen, setProfileOpen] = useState(false);  // قائمة الملف الشخصي المنسدلة
  const [tzOpen, setTzOpen] = useState(false);            // قائمة المنطقة الزمنية المنسدلة
  const [paletteOpen, setPaletteOpen] = useState(false);  // لوحة البحث (Ctrl/⌘+K)
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [cardSignal] = useState({ v: 0, collapsed: false });
  const { logo, appBackground, appName, appSubtitle, appNameEn, appSubtitleEn, appBgDim, appBgShow, pageSize } = useBranding();
  const isMobile = useIsMobile();

  // المستخدم الحالي وصلاحياته + لغته المحفوظة على حسابه
  useEffect(() => {
    fetchJson('/api/auth/me').then((d) => {
      setMe(d.user);
      if (d.user?.lang === 'ar' || d.user?.lang === 'en') setLang(d.user.lang);
      if (d.user?.theme === 'light' || d.user?.theme === 'dark') setTheme(d.user.theme);
      if (d.user?.timezone) setTz(d.user.timezone);
    }).catch(() => {});
  }, []);

  // ---- وضع العمل دون اتصال (PWA) ----
  // متابعة حالة الاتصال لعرض مؤشّر «دون اتصال»
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    up();
    window.addEventListener('online', up);
    window.addEventListener('offline', up);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', up); };
  }, []);

  // تسجيل عامل الخدمة فقط لمن يملك صلاحية use_offline وعلى سياق آمن (HTTPS).
  // عند غياب الصلاحية أو غياب HTTPS: إلغاء التسجيل ومسح المخزّن.
  const offlineAllowed = !!me?.permissions?.includes('use_offline');
  useEffect(() => {
    if (!me || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (offlineAllowed && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } else {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => {
        try { r.active?.postMessage('pms-clear-offline'); } catch { /* تجاهل */ }
        r.unregister();
      })).catch(() => {});
      if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, [me, offlineAllowed]);

  // تغيير اللغة: فوري + حفظ على حساب المستخدم
  const changeLang = (l) => {
    setLang(l);
    fetch('/api/auth/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: l }) }).catch(() => {});
  };
  // تغيير الثيم: فوري + حفظ على حساب المستخدم
  const changeTheme = (th) => {
    setTheme(th);
    fetch('/api/auth/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: th }) }).catch(() => {});
  };
  // تغيير المنطقة الزمنية: فوري + حفظ على الحساب
  const changeTimezone = (z) => {
    setTz(z);
    try { localStorage.setItem('tz', z); } catch { /* تجاهل */ }
    fetch('/api/auth/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: z }) }).catch(() => {});
  };

  // استعادة التفضيلات المحفوظة محلياً
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'ar' || savedLang === 'en') setLang(savedLang);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    const savedTz = localStorage.getItem('tz');
    if (savedTz) setTz(savedTz);
  }, []);

  useEffect(() => {
    const t = DICT[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // بيانات تعريفية (رابط جيرا + آخر مزامنة) — تُحدَّث مع كل تحديث
  useEffect(() => {
    fetchJson('/api/meta').then(setMeta).catch(() => {});
  }, [reloadKey]);

  // اختصار البحث العام: Ctrl/⌘ + K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const t = DICT[lang];
  // المنطقة الفعّالة: تفضيل المستخدم أو منطقة الجهاز عند «تلقائي»
  const effTz = tz && tz !== 'auto' ? tz : deviceTz();
  const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('en-US').format(n));
  // التاريخ‑فقط (استحقاق/تأجيل/أسبوع): يُعرض بـUTC كما هو مخزَّن كي لا ينزلق يوماً بين الدول
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString(t.locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }) : '—';
  // اللحظات (إنشاء/آخر تعديل/مزامنة): تُعرض بتوقيت المستخدم
  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString(t.locale, {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: effTz,
        })
      : t.never;
  const refresh = () => setReloadKey((k) => k + 1);

  const perms = me?.permissions || [];
  const can = (k) => perms.includes(k);
  const hasAdmin = can('manage_users') || can('manage_roles') || can('manage_integration')
    || can('manage_branding') || can('manage_settings') || can('view_audit');

  // نموذج القائمة الجانبية: تصنيفات ← شاشات (ERPNext) مع أيقونات خطّية
  const ADM_ICONS = { users: 'users', roles: 'shield', companies: 'briefcase', integration: 'link', ai: 'cpu', branding: 'image', settings: 'settings', logs: 'fileText' };
  const menu = useMemo(() => {
    const cats = [];
    // لوحة المعلومات: مدخل واحد مباشر يفتح كل المحتوى (KPI + الأدوات) — بلا عنصر فرعي
    if (can('view_dashboard')) cats.push({ id: 'dash', label: t.navDashboard, icon: 'dashboard', solo: true, targetId: 'dash_main' });

    // مداخل رئيسية مستقلّة بالترتيب (مثل لوحة المعلومات) — لا تصنيفات
    if (can('view_operational')) cats.push({ id: 'projtickets', label: t.projectTickets, icon: 'list', solo: true, targetId: 'ops_alltickets' });
    if (can('view_managerial')) {
      cats.push({ id: 'perf', label: t.performance, icon: 'award', solo: true, targetId: 'mgmt_performance' });
      cats.push({ id: 'score', label: t.scorecard, icon: 'shield', solo: true, targetId: 'mgmt_scorecard' });
      cats.push({ id: 'flow', label: t.flow, icon: 'shuffle', solo: true, targetId: 'mgmt_flow' });
      cats.push({ id: 'sla', label: t.sla, icon: 'clock', solo: true, targetId: 'mgmt_sla' });
      cats.push({ id: 'deps', label: t.depBottlenecks, icon: 'link', solo: true, targetId: 'mgmt_deps' });
    }
    if (can('view_dependency_log')) cats.push({ id: 'deplog', label: t.depLog, icon: 'fileText', solo: true, targetId: 'mgmt_deplog' });
    if (hasAdmin) cats.push({ id: 'admin', label: t.navAdmin, icon: 'settings', items:
      adminSections(perms, lang).map((s) => ({ id: `adm:${s.id}`, label: s.label, icon: ADM_ICONS[s.id] || 'settings' })) });
    // «حسابي» انتقل إلى قائمة منسدلة في ترويسة الملف الشخصي (وليس في الشريط الجانبي)
    return cats;
  }, [me, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // أول شاشة متاحة بمجرد معرفة الصلاحيات (مع رجوع لشاشة الأمان إن لم تتوفّر شاشات)
  useEffect(() => {
    if (me && !screen) {
      const first = menu[0];
      setScreen((first?.solo ? first.targetId : first?.items?.[0]?.id) || 'acc:2fa');
    }
  }, [me, menu]); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // امسح بيانات الوضع دون اتصال كي لا تبقى محفوظة بعد الخروج
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        regs.forEach((r) => r.active?.postMessage('pms-clear-offline'));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* تجاهل */ }
    window.location.href = '/login';
  }

  // تشغيل مزامنة جيرا من التطبيق (تعمل في الخلفية)
  async function syncNow() {
    if (syncing) return;
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/sync/run', { method: 'POST' });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'error');
      setSyncMsg(j.data?.alreadyRunning ? t.syncBusy : t.syncStarted);
      // حدّث البيانات بعد مهلة لإتاحة وقت للمزامنة
      setTimeout(() => { setReloadKey((k) => k + 1); setSyncMsg(''); }, 20000);
    } catch (e) {
      setSyncMsg(`${t.syncFail}: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  const go = (id) => { setScreen(id); if (isMobile) setDrawer(false); };

  // مزامنة تلقائية عند الدخول (مرّة واحدة لكل جلسة، مع كَبح زمني في الخادم)
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (!me || autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    fetch('/api/sync/run?auto=1', { method: 'POST' })
      .then((r) => r.json())
      .then((j) => { if (j?.data?.started) setTimeout(() => setReloadKey((k) => k + 1), 20000); })
      .catch(() => {});
  }, [me]);

  const renderScreen = () => {
    if (!screen) return <Loading />;
    if (screen === 'dash_main') return <DashboardScreen key={`dash-${reloadKey}`} perms={perms} userId={me?.id} />;
    if (screen === 'mgmt_deplog') return <DependencyLog key={`dl-${reloadKey}`} />;
    if (screen.startsWith('ops_')) return <OperationalTab key={`op-${reloadKey}`} screen={screen.slice(4)} />;
    if (screen.startsWith('mgmt_')) return <ManagerialTab key={`mg-${reloadKey}`} screen={screen.slice(5)} />;
    if (screen.includes(':')) return <AdminPanel key={`ad-${reloadKey}`} lang={lang} perms={perms} section={screen.split(':')[1]} />;
    return <Loading />;
  };

  const sidebarVisible = isMobile ? drawer : menuOpen;
  const SIDEBAR_W = 248;
  const appTitle = (lang === 'en' ? (appNameEn || appName) : (appName || appNameEn)) || t.title;

  return (
    <LangCtx.Provider value={{ lang, t, fmt, fmtDate, fmtDateTime, jiraBaseUrl: meta?.jiraBaseUrl || null, perms, pageSize, cardSignal }}>
      <div style={{ height: '100vh', overflow: 'hidden', background: C.bg, color: C.text, display: 'flex', ...backgroundStyle(appBgShow ? appBackground : null, appBgDim) }}>
        {/* خلفية معتمة للدرج على الجوال */}
        {isMobile && drawer && (
          <div onClick={() => setDrawer(false)} className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 40 }} />
        )}

        {/* الشريط الجانبي */}
        {sidebarVisible && (
          <aside
            className="no-print"
            style={{
              width: SIDEBAR_W, flexShrink: 0, background: C.card, borderInlineEnd: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', overflowY: 'auto',
              ...(isMobile
                ? { position: 'fixed', insetBlock: 0, insetInlineStart: 0, zIndex: 50 }
                : { position: 'sticky', top: 0, height: '100vh' }),
            }}
          >
            <div style={{ padding: '16px 14px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="logo" style={{ height: 42, maxWidth: 170, objectFit: 'contain' }} />
              )}
              <strong style={{ fontSize: 15, lineHeight: 1.35 }}>{appTitle}</strong>
            </div>
            <nav style={{ padding: 8, flex: 1 }}>
              {menu.map((cat) => {
                // مدخل مفرد (مثل لوحة المعلومات): زر تنقّل مباشر بلا عنوان/عناصر فرعية
                if (cat.solo) {
                  const active = screen === cat.targetId;
                  return (
                    <div key={cat.id} style={{ marginBottom: 6 }}>
                      <button
                        onClick={() => go(cat.targetId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start',
                          padding: '9px 12px', marginBottom: 2, border: 0, borderRadius: 6, cursor: 'pointer',
                          fontSize: 13.5, fontWeight: active ? 700 : 600,
                          background: active ? C.green : 'transparent', color: active ? '#fff' : C.text,
                          borderInlineStart: active ? `3px solid ${C.green}` : '3px solid transparent',
                        }}
                      >
                        <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}><Icon name={cat.icon} size={16} /></span>
                        <span style={{ flex: 1 }}>{cat.label}</span>
                      </button>
                    </div>
                  );
                }
                const catCollapsed = !!collapsedCats[cat.id];
                return (
                  <div key={cat.id} style={{ marginBottom: 6 }}>
                    <button
                      onClick={() => setCollapsedCats((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
                      title={cat.label}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', border: 0, background: 'transparent', cursor: 'pointer',
                        fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', color: C.muted,
                        textTransform: 'uppercase', textAlign: 'start',
                      }}
                    >
                      <Icon name={cat.icon} size={15} />
                      <span style={{ flex: 1 }}>{cat.label}</span>
                      <span aria-hidden style={{ fontSize: 10, transition: 'transform .15s' }}>{catCollapsed ? '▸' : '▾'}</span>
                    </button>
                    {!catCollapsed && cat.items.map((it) => {
                      const active = screen === it.id;
                      return (
                        <button
                          key={it.id}
                          onClick={() => go(it.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start',
                            padding: '8px 12px', marginBottom: 2, border: 0, borderRadius: 6, cursor: 'pointer',
                            fontSize: 13.5, fontWeight: active ? 700 : 500,
                            background: active ? C.green : 'transparent',
                            color: active ? '#fff' : C.text,
                            borderInlineStart: active ? `3px solid ${C.green}` : '3px solid transparent',
                          }}
                        >
                          <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', opacity: active ? 1 : 0.8 }}><Icon name={it.icon} size={16} /></span>
                          <span style={{ flex: 1 }}>{it.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </aside>
        )}

        {/* العمود الرئيسي */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            className="no-print"
            style={{
              background: C.card, borderBottom: `1px solid ${C.border}`,
              padding: isMobile ? '10px 14px' : '12px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              position: 'sticky', top: 0, zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button
                onClick={() => (isMobile ? setDrawer((v) => !v) : setMenuOpen((v) => !v))}
                title={sidebarVisible ? t.menuHide : t.menuShow}
                style={{ ...ghostBtn, fontSize: 18, lineHeight: 1, padding: '4px 10px' }}
              >☰</button>
              <span className="pms-tip" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'default', padding: '2px 0' }} aria-label={`${t.lastSync}: ${fmtDateTime(meta?.lastSyncAt)}`}>
                <span className="pms-live-dot" />
                <span className="pms-tip-box">{fmtDateTime(meta?.lastSyncAt)}</span>
              </span>
              {offlineAllowed && !online && (
                <span className="pms-tip" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#7c2d12', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                  ⚠︎ {t.offlineBadge}
                  <span className="pms-tip-box">{t.offlineTip}</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setPaletteOpen(true)}
              title="Ctrl/⌘ + K"
              style={{ display: 'flex', alignItems: 'center', gap: 8, flex: isMobile ? '0 0 auto' : '0 1 320px', maxWidth: 320, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, borderRadius: 8, padding: isMobile ? '7px 9px' : '7px 12px', cursor: 'pointer', fontSize: 13 }}
            >
              <Icon name="search" size={16} />
              {!isMobile && <span style={{ flex: 1, textAlign: 'start' }}>{t.searchPlaceholder}</span>}
              {!isMobile && <kbd style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 5px' }}>Ctrl K</kbd>}
            </button>
            <nav style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {can('trigger_sync') && (
                <button onClick={syncNow} disabled={syncing} title={t.syncNow} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: syncing ? 0.6 : 1 }}>
                  <Icon name="refresh" size={14} /> {!isMobile && t.syncNow}
                </button>
              )}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setTzOpen((v) => !v)} title={`${t.tzLabel} — ${effTz}`} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="globe" size={15} /> {!isMobile && effTz}
                </button>
                {tzOpen && (
                  <>
                    <div onClick={() => setTzOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                    <div style={{ position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + 6px)', zIndex: 50, minWidth: 240, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,.18)', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: C.text }}>
                        <Icon name="globe" size={15} /> {t.tzLabel}
                      </span>
                      <select value={tz} onChange={(e) => changeTimezone(e.target.value)} style={{ ...inputStyle, width: '100%', fontSize: 13 }}>
                        <option value="auto">{t.tzAuto}</option>
                        {TZ_LIST.map((z) => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <span style={{ fontSize: 11.5, color: C.muted }}>{t.tzShownIn}: {effTz}{tz === 'auto' ? ` (${t.tzAuto})` : ''}</span>
                    </div>
                  </>
                )}
              </div>
              <button onClick={refresh} title={t.refresh} style={ghostBtn}>↻</button>
              <button onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')} title="theme" style={ghostBtn}>
                {theme === 'dark' ? '☀︎' : '☾'}
              </button>
              <button onClick={() => changeLang(lang === 'ar' ? 'en' : 'ar')} title={t.other} style={ghostBtn}>
                {t.other}
              </button>
              {me && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setProfileOpen((v) => !v)}
                    title={t.navAccount}
                    style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '4px 8px', border: `1px solid ${C.border}`, background: profileOpen ? C.bg : C.card, borderRadius: 20, cursor: 'pointer', fontSize: 13, color: C.text }}
                  >
                    {me.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/api/auth/avatar" alt="" width={26} height={26} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 26, height: 26, borderRadius: '50%', background: C.blue, color: '#fff', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{initials(me.fullName || me.username)}</span>
                    )}
                    {!isMobile && <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.username}</span>}
                    <span aria-hidden style={{ fontSize: 9, color: C.muted }}>▾</span>
                  </button>
                  {profileOpen && (
                    <>
                      <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div style={{ position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + 6px)', zIndex: 50, minWidth: 220, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,.18)', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{me.fullName || me.username}</div>
                          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{me.email || me.username}</div>
                        </div>
                        <button
                          onClick={() => { go('acc:2fa'); setProfileOpen(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start', padding: '10px 14px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13.5, color: C.text }}
                        >
                          <Icon name="settings" size={15} /> {t.scrSecurity}
                        </button>
                        <button
                          onClick={logout}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start', padding: '10px 14px', border: 0, borderTop: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 13.5, color: C.red }}
                        >
                          <Icon name="logout" size={15} /> {t.logout}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </nav>
          </header>

          {syncMsg && (
            <div className="no-print" style={{ background: `${C.blue}12`, borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 13, padding: '8px 20px' }}>
              {syncMsg}
            </div>
          )}

          <main style={{ padding: isMobile ? 12 : 20, flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {renderScreen()}
          </main>
        </div>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          menu={menu}
          onNavigate={go}
          jiraBaseUrl={meta?.jiraBaseUrl || null}
          canTickets={can('view_operational')}
          t={t}
        />
      </div>
    </LangCtx.Provider>
  );
}

// ------------------------------------------------------------------- shared UI
function Card({ title, children, extra, hint }) {
  const ui = useUI();
  const [showHint, setShowHint] = useState(false);
  // كل البطاقات مطويّة افتراضياً — تُفتح بالنقر على الأيقونة
  const [collapsed, setCollapsed] = useState(true);
  // مزامنة مع زر «طي/فتح الكل» — فقط بعد نقر المستخدم (v>0)، حتى لا يُلغى الطي الافتراضي
  const sig = ui?.cardSignal;
  useEffect(() => { if (sig && sig.v > 0) setCollapsed(sig.collapsed); }, [sig?.v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 12, gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="toggle"
              style={{ width: 20, height: 20, border: `1px solid ${C.border}`, borderRadius: 4, background: collapsed ? C.blue : 'transparent', color: collapsed ? '#fff' : C.muted, cursor: 'pointer', padding: 0, fontSize: 11 }}
            >{collapsed ? '▸' : '▾'}</button>
            <span onClick={() => setCollapsed((v) => !v)} style={{ cursor: 'pointer' }}>{title}</span>
            {hint && !collapsed && (
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                title={hint}
                aria-label="info"
                style={{ width: 18, height: 18, lineHeight: '16px', textAlign: 'center', borderRadius: '50%', border: `1px solid ${C.border}`, background: showHint ? C.blue : 'transparent', color: showHint ? '#fff' : C.muted, fontSize: 12, cursor: 'pointer', padding: 0 }}
              >ⓘ</button>
            )}
          </h2>
          {!collapsed && extra}
        </div>
      )}
      {/* عند الطي: نعرض التلميح كنبذة عن محتوى البطاقة */}
      {collapsed && hint && (
        <div onClick={() => setCollapsed(false)} style={{ marginTop: 6, fontSize: 12.5, color: C.muted, lineHeight: 1.5, cursor: 'pointer' }}>
          {hint}
        </div>
      )}
      {!collapsed && hint && showHint && (
        <div style={{ background: `${C.blue}10`, border: `1px solid ${C.blue}33`, borderRadius: 6, padding: '8px 10px', marginBottom: 12, fontSize: 12.5, color: C.text, lineHeight: 1.6 }}>
          {hint}
        </div>
      )}
      {!collapsed && children}
    </section>
  );
}

// شاشة بنمط ERPNext: ترويسة (عنوان + تلميح + إجراءات) ثم المحتوى — تُفتح من القائمة الجانبية
function Screen({ title, hint, extra, children, collapsible = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const canCollapse = collapsible && !!title;
  return (
    <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
      {(title || extra) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: collapsed ? 0 : 14, borderBottom: collapsed ? 'none' : `1px solid ${C.border}`, paddingBottom: collapsed ? 0 : 12 }}>
          <div style={{ minWidth: 0, flex: isMobile ? '1 1 100%' : 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              {canCollapse && (
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  aria-label="toggle"
                  style={{ width: 22, height: 22, flexShrink: 0, border: `1px solid ${C.border}`, borderRadius: 5, background: collapsed ? C.blue : 'transparent', color: collapsed ? '#fff' : C.muted, cursor: 'pointer', padding: 0, fontSize: 11 }}
                >{collapsed ? '▸' : '▾'}</button>
              )}
              <span onClick={canCollapse ? () => setCollapsed((v) => !v) : undefined} style={{ cursor: canCollapse ? 'pointer' : 'default' }}>{title}</span>
            </h2>
            {hint && !collapsed && <p style={{ margin: '5px 0 0', color: C.muted, fontSize: 12.5, lineHeight: 1.5, maxWidth: 720 }}>{hint}</p>}
          </div>
          {extra && !collapsed && <div className="no-print" style={{ flexShrink: 0, ...(isMobile ? { flexBasis: '100%' } : {}) }}>{extra}</div>}
        </div>
      )}
      {!collapsed && children}
    </section>
  );
}

function StatCard({ label, value, color, suffix, hint }) {
  const { fmt } = useUI();
  return (
    <div
      title={hint || undefined}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color || C.green}`,
        borderRadius: 8,
        padding: '14px 16px',
        flex: '1 1 140px',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.text }}>
        {fmt(value)}
        {value != null && suffix ? <span style={{ fontSize: 15, fontWeight: 600 }}>{suffix}</span> : null}
      </div>
      <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Chip({ color, children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: `${color}15`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 12,
        padding: '2px 9px',
        fontSize: 12,
        margin: '0 2px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function Th({ children, align }) {
  const { t } = useUI();
  return (
    <th style={{ textAlign: align || (t.dir === 'rtl' ? 'right' : 'left'), padding: '8px 10px', borderBottom: `2px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 600 }}>
      {children}
    </th>
  );
}

function Td({ children, align }) {
  const { t } = useUI();
  return (
    <td style={{ textAlign: align || (t.dir === 'rtl' ? 'right' : 'left'), padding: '8px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      {children}
    </td>
  );
}

// مفتاح التذكرة كرابط يفتح التذكرة في جيرا (إن توفّر الرابط الأساسي)
function KeyLink({ k }) {
  const { jiraBaseUrl } = useUI();
  if (!jiraBaseUrl) return <strong>{k}</strong>;
  return (
    <a
      href={`${jiraBaseUrl}/browse/${k}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: C.blue, textDecoration: 'none', fontWeight: 700 }}
    >
      {k}
    </a>
  );
}

function Loading() {
  const { t } = useUI();
  return <div style={{ color: C.muted, padding: 20, textAlign: 'center' }}>{t.loading}</div>;
}
function ErrorBox({ message }) {
  const { t } = useUI();
  return (
    <div style={{ color: C.red, padding: 14, background: `${C.red}10`, borderRadius: 6, fontSize: 13 }}>
      {t.loadError}{message}
    </div>
  );
}

function BarRow({ label, value, max, color, suffix }) {
  const { fmt } = useUI();
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 160, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, background: C.bg, borderRadius: 4, height: 18 }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4 }} />
      </div>
      <div style={{ width: 80, fontSize: 13, color: C.muted }}>
        {fmt(value)}{suffix || ''}
      </div>
    </div>
  );
}

// قيمة خاصة تمثّل "بدون مسؤول" في فلتر المسؤول
const UNASSIGNED = ' unassigned';

// قائمة تصنيف متعددة الاختيار (checkboxes داخل منسدلة)
function MultiSelect({ label, value, options, onChange, labels = {} }) {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const labelFor = (o) => labels[o] || o;
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const summary = value.length === 0 ? t.all : value.length === 1 ? labelFor(value[0]) : `${value.length}`;

  return (
    <div ref={ref} style={{ position: 'relative', fontSize: 13 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...inputStyle, cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center', maxWidth: 220 }}
      >
        <span style={{ color: C.muted }}>{label}:</span>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</strong>
        <span style={{ color: C.muted }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 30, top: '100%', insetInlineStart: 0, marginTop: 4,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,.08)', padding: 6, minWidth: 190, maxHeight: 280, overflowY: 'auto',
          }}
        >
          {value.length > 0 && (
            <button onClick={() => onChange([])} style={{ ...ghostBtn, width: '100%', marginBottom: 4 }}>{t.clear}</button>
          )}
          {options.length === 0 && <div style={{ color: C.muted, padding: 6 }}>—</div>}
          {options.map((o) => (
            <label key={o} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: o === UNASSIGNED ? C.purple : undefined }}>{labelFor(o)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// تصدير صفوف إلى CSV وتنزيلها (مع BOM لدعم العربية في Excel)
function downloadCsv(rows, t) {
  const headers = [t.thKey, t.thSummary, t.thType, t.fProject, t.thStatus, t.thPriority, t.thAssignee, t.thCreator, t.thLastActor, t.thDue, t.thDays, t.thReasons];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const dt = (v) => (v ? String(v).slice(0, 16).replace('T', ' ') : '');
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) {
    lines.push([
      r.key, r.summary, r.issueType || '', r.project, r.status, r.priority, r.assignee || '',
      r.reporter ? `${r.reporter}${r.createdAt ? ` (${dt(r.createdAt)})` : ''}` : dt(r.createdAt),
      r.lastActor ? `${r.lastActor}${r.lastActorAt ? ` (${dt(r.lastActorAt)})` : ''}` : '',
      r.dueDate || '', r.daysInStatus, r.reasonsAr ? r.reasonsAr.join(' | ') : r.reasons.join(' | '),
    ].map(esc).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exceptions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'error');
  return j.data;
}

// منطقة نص مع إكمال الإشارات @ من مستخدمي جيرا
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// إحداثيات المؤشّر داخل textarea — لإظهار قائمة الإشارات بجانب «@».
function caretCoords(el, pos) {
  if (typeof document === 'undefined') return { top: 0, left: 0 };
  const style = getComputedStyle(el);
  const div = document.createElement('div');
  const props = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontStyle',
    'fontWeight', 'fontSize', 'fontFamily', 'lineHeight', 'letterSpacing', 'textTransform',
    'wordSpacing', 'textIndent', 'direction'];
  props.forEach((p) => { div.style[p] = style[p]; });
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflow = 'hidden';
  div.style.top = '0';
  div.style.left = '0';
  div.textContent = el.value.slice(0, pos);
  const span = document.createElement('span');
  span.textContent = el.value.slice(pos) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const top = span.offsetTop - el.scrollTop;
  const left = span.offsetLeft - el.scrollLeft;
  document.body.removeChild(div);
  return {
    top,
    left,
    w: el.clientWidth,
    lh: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3,
  };
}

function MentionTextarea({ value, onChange, onMention, rows = 4, placeholder }) {
  const ref = useRef(null);
  const debRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState([]);
  const [match, setMatch] = useState(null);
  const [hover, setHover] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, w: 0, lh: 20 });
  const DW = 250; // عرض القائمة الثابت لحساب القَصّ داخل الإطار

  function search(q) {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      try { const d = await fetchJson(`/api/jira/users?q=${encodeURIComponent(q)}`); setSugg(d.users || []); }
      catch { setSugg([]); }
    }, 200);
  }
  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    const caret = e.target.selectionStart;
    const upto = val.slice(0, caret);
    const m = upto.match(/@([^\s@]{0,40})$/);
    if (m) {
      // ضع القائمة عند موضع «@» نفسه
      const atPos = caret - m[0].length;
      setPos(caretCoords(e.target, atPos));
      setMatch({ len: m[0].length, caret }); setOpen(true); setHover(-1); search(m[1]);
    } else { setOpen(false); }
  }
  function pick(u) {
    const ta = ref.current;
    const caret = match.caret;
    const val = ta.value;
    const before = val.slice(0, caret).slice(0, -match.len);
    const after = val.slice(caret);
    const insert = `@${u.name} `;
    const newVal = before + insert + after;
    onChange(newVal);
    onMention && onMention({ accountId: u.accountId, display: u.name });
    setOpen(false);
    requestAnimationFrame(() => { ta.focus(); const p = (before + insert).length; ta.setSelectionRange(p, p); });
  }
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        rows={rows}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', ...inputStyle }}
      />
      {open && sugg.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 60, top: pos.top + pos.lh + 2, left: Math.max(0, Math.min(pos.left - 8, (pos.w || DW) - DW)), width: DW, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.18)', maxHeight: 240, overflowY: 'auto', padding: 4, boxSizing: 'border-box' }}>
          {sugg.map((u, i) => (
            <div key={u.accountId}
              onMouseEnter={() => setHover(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(u); }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', cursor: 'pointer', borderRadius: 6, background: hover === i ? (C.bg) : 'transparent', lineHeight: 1.2 }}>
              <span style={{ flex: '0 0 auto', width: 26, height: 26, borderRadius: '50%', background: C.blue, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(u.name)}</span>
              <span dir="auto" style={{ fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// سجل التذكرة الكامل (مباشر من جيرا): المهام الفرعية + التعليقات + سجل التغييرات
function HistorySection({ ticketKey }) {
  const { t, fmt, fmtDateTime, jiraBaseUrl } = useUI();
  const [data, setData] = useState(null);
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [shown, setShown] = useState(0);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchJson(`/api/tickets/${ticketKey}/history?cstart=0`)
      .then((d) => { setData(d); setComments(d.comments.items); setTotal(d.comments.total); setShown(d.comments.items.length); })
      .catch((e) => setErr(e.message));
  }, [ticketKey]);

  async function more() {
    try {
      const d = await fetchJson(`/api/tickets/${ticketKey}/history?cstart=${shown}`);
      setComments((c) => [...c, ...d.comments.items]);
      setShown((s) => s + d.comments.items.length);
    } catch (e) { setErr(e.message); }
  }

  if (err) return <ErrorBox message={err} />;
  if (!data) return <Loading />;

  const block = { fontSize: 13, color: C.muted, fontWeight: 600, margin: '4px 0 6px' };
  return (
    <div style={{ fontSize: 13 }}>
      {data.subtasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={block}>{t.subtasksL} ({data.subtasks.length})</div>
          {data.subtasks.map((s) => (
            <div key={s.key} style={{ padding: '3px 0', borderBottom: `1px solid ${C.border}` }}>
              {jiraBaseUrl ? <a href={`${jiraBaseUrl}/browse/${s.key}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontWeight: 600 }}>{s.key}</a> : <strong>{s.key}</strong>}
              {' '}{s.summary} {s.status && <Chip color="#8a96a3">{s.status}</Chip>}
            </div>
          ))}
        </div>
      )}

      <div style={block}>{t.commentsL} ({fmt(total)})</div>
      {comments.length === 0 && <div style={{ color: C.muted }}>{t.noHistory}</div>}
      {comments.map((c, i) => (
        <div key={i} style={{ padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 2 }}>{c.author || '—'} · {fmtDateTime(c.created)}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{c.body || '—'}</div>
        </div>
      ))}
      {shown < total && <button onClick={more} style={{ ...ghostBtn, marginTop: 8 }}>{t.loadMore} ({total - shown})</button>}

      <div style={{ ...block, marginTop: 14 }}>{t.changelogL} ({data.changelog.length})</div>
      {data.changelog.length === 0 && <div style={{ color: C.muted }}>{t.noHistory}</div>}
      {data.changelog.map((h, i) => (
        <div key={i} style={{ padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.muted, fontSize: 12 }}>{h.author || '—'} · {fmtDateTime(h.created)}</div>
          {h.items.map((it, j) => (
            <div key={j} style={{ fontSize: 12.5 }}>
              <span style={{ color: C.muted }}>{it.field}:</span> {it.from || '∅'} → <strong>{it.to || '∅'}</strong>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// نافذة إجراءات على تذكرة: تعليق · إسناد · نقل الحالة (Write-back لجيرا)
function TicketActions({ ticket, onClose, onDone }) {
  const { t, perms } = useUI();
  const canAct = (perms || []).includes('act_tickets');
  const canManage = (perms || []).includes('manage_exceptions');
  // حالة المتابعة
  const [fu, setFu] = useState({ acknowledged: false, note: '', snoozeUntil: '', ownerUserId: '', rootCause: '' });
  const [userOpts, setUserOpts] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [mentions, setMentions] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [transitions, setTransitions] = useState([]);
  const [transitionId, setTransitionId] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [editFields, setEditFields] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [linkRelation, setLinkRelation] = useState('blocked_by');
  const [linkOther, setLinkOther] = useState('');
  const [linkSug, setLinkSug] = useState([]);
  const [linkSugOpen, setLinkSugOpen] = useState(false);
  const [links, setLinks] = useState([]);
  const [unlinkReason, setUnlinkReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState(null);

  const actTabs = [
    canManage && 'followup',
    'history',
    canAct && 'comment',
    canAct && 'assign',
    canAct && 'fields',
    canAct && 'transition',
    canAct && 'link',
  ].filter(Boolean);
  const tabLabel = { followup: t.followup, history: t.history, comment: t.comment, assign: t.assign, fields: t.editFields, transition: t.transition, link: t.linkDep };

  useEffect(() => {
    if (!ticket) return;
    setTab((prev) => prev || (canManage ? 'followup' : canAct ? 'comment' : null));
    if (canManage) {
      const f = ticket.followup || {};
      setFu({
        acknowledged: !!f.acknowledged,
        note: f.note || '',
        snoozeUntil: f.snoozeUntil ? String(f.snoozeUntil).slice(0, 10) : '',
        ownerUserId: f.ownerId || '',
        rootCause: f.rootCause || '',
      });
      fetchJson('/api/users/options').then((d) => setUserOpts(d.users)).catch(() => {});
    }
    if (canAct) {
      fetchJson(`/api/tickets/${ticket.key}/assign`).then((d) => setAssignees(d.assignees)).catch(() => {});
      fetchJson(`/api/tickets/${ticket.key}/transition`).then((d) => setTransitions(d.transitions)).catch(() => {});
      fetchJson(`/api/tickets/${ticket.key}/fields`).then((d) => setEditFields(d.fields)).catch(() => {});
      fetchJson(`/api/tickets/${ticket.key}/link`).then((d) => setLinks(d.links || [])).catch(() => {});
    }
  }, [ticket, canAct, canManage]);

  // اقتراح تذاكر أثناء كتابة مفتاح التذكرة الأخرى (اعتمادية)
  useEffect(() => {
    const q = linkOther.trim();
    if (q.length < 1) { setLinkSug([]); return; }
    const id = setTimeout(() => {
      fetchJson(`/api/tickets/search?q=${encodeURIComponent(q)}`)
        .then((d) => setLinkSug((d.items || []).filter((s) => s.key !== ticket.key)))
        .catch(() => setLinkSug([]));
    }, 200);
    return () => clearTimeout(id);
  }, [linkOther, ticket.key]);

  // بناء حمولة الحقول بصيغة جيرا
  const buildEditPayload = () => {
    const out = {};
    for (const f of editFields) {
      const v = editValues[f.id];
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      if (f.type === 'array') {
        out[f.id] = f.allowedValues.length > 0
          ? (Array.isArray(v) ? v : [v]).map((id) => ({ id }))
          : String(v).split(',').map((s) => s.trim()).filter(Boolean);
      } else if (f.allowedValues.length > 0) {
        out[f.id] = { id: v };
      } else {
        out[f.id] = v;
      }
    }
    return out;
  };

  if (!ticket) return null;

  async function run(fn) {
    setBusy(true); setErr(''); setMsg('');
    try { await fn(); setMsg(t.actDone); onDone?.(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const refetchLinks = () => fetchJson(`/api/tickets/${ticket.key}/link`).then((d) => setLinks(d.links || [])).catch(() => {});
  const removeLink = (l) => run(async () => {
    const res = await fetch(`/api/tickets/${ticket.key}/link`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkId: l.id, otherKey: l.otherKey, depends: l.depends, reason: unlinkReason.trim() }) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'error');
    setUnlinkReason('');
    await refetchLinks();
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 10, padding: 20, width: 340, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{ticket.key}</h3>
          <button onClick={onClose} style={ghostBtn}>{t.close}</button>
        </div>

        {/* تبويبات الإجراءات */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
          {actTabs.map((k) => (
            <button key={k} onClick={() => { setTab(k); setMsg(''); setErr(''); }}
              style={{ ...ghostBtn, ...(tab === k ? { background: C.green, color: '#fff', border: 0 } : {}) }}>
              {tabLabel[k]}
            </button>
          ))}
        </div>

        {/* المتابعة الإدارية */}
        {tab === 'followup' && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0', fontSize: 14 }}>
              <input type="checkbox" checked={fu.acknowledged} onChange={(e) => setFu({ ...fu, acknowledged: e.target.checked })} />
              {t.acknowledge}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: C.muted }}>
                {t.snoozeUntil}
                <input type="date" value={fu.snoozeUntil} onChange={(e) => setFu({ ...fu, snoozeUntil: e.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 2 }} />
              </label>
              <label style={{ fontSize: 12, color: C.muted }}>
                {t.owner}
                <select value={fu.ownerUserId} onChange={(e) => setFu({ ...fu, ownerUserId: e.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 2, cursor: 'pointer' }}>
                  <option value="">{t.pick}</option>
                  {userOpts.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: C.muted }}>
                {t.rootCause}
                <select value={fu.rootCause} onChange={(e) => setFu({ ...fu, rootCause: e.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 2, cursor: 'pointer' }}>
                  <option value="">{t.pick}</option>
                  {Object.keys(t.rc).map((k) => <option key={k} value={k}>{t.rc[k]}</option>)}
                </select>
              </label>
            </div>
            <input value={fu.note} onChange={(e) => setFu({ ...fu, note: e.target.value })} placeholder={t.noteL} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 6 }} />
            <button disabled={busy} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/followup`, { acknowledged: fu.acknowledged, note: fu.note, snoozeUntil: fu.snoozeUntil || null, ownerUserId: fu.ownerUserId || null, rootCause: fu.rootCause || null }))} style={{ background: C.green, color: '#fff', border: 0, borderRadius: 5, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>{t.saveFollowup}</button>
          </div>
        )}

        {/* السجل */}
        {tab === 'history' && <HistorySection ticketKey={ticket.key} />}

        {/* تعليق */}
        {tab === 'comment' && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: C.muted }}>{t.comment}</label>
          <button
            disabled={aiBusy}
            onClick={async () => {
              setAiBusy(true); setErr('');
              try { const d = await postJson(`/api/tickets/${ticket.key}/suggest-comment`); setCommentText(d.suggestion || ''); }
              catch (e) { setErr(e.message); }
              finally { setAiBusy(false); }
            }}
            style={{ ...ghostBtn, color: C.purple }}
          >{aiBusy ? t.aiThinking : t.aiSuggest}</button>
        </div>
        <div style={{ marginTop: 6, marginBottom: 6 }}>
          <MentionTextarea value={commentText} onChange={setCommentText} onMention={(m) => setMentions((ms) => (ms.find((x) => x.accountId === m.accountId) ? ms : [...ms, m]))} rows={4} placeholder="@" />
        </div>
        <button disabled={busy || !commentText.trim()} onClick={() => run(async () => { await postJson(`/api/tickets/${ticket.key}/comment`, { body: commentText, mentions }); setCommentText(''); setMentions([]); })} style={ghostBtn}>{t.send}</button>
        </>)}

        {/* إسناد */}
        {tab === 'assign' && (<>
        <label style={{ fontSize: 13, color: C.muted, display: 'block' }}>{t.assign}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
            <option value="">{t.pick}</option>
            <option value="__unassign__">— {t.unassign} —</option>
            {assignees.map((a) => <option key={a.accountId} value={a.accountId}>{a.name}</option>)}
          </select>
          <button disabled={busy || !accountId} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/assign`, { accountId: accountId === '__unassign__' ? null : accountId }))} style={ghostBtn}>{t.apply}</button>
        </div>
        </>)}

        {/* اعتمادية / حجب بين التذاكر */}
        {tab === 'link' && (<>
        <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 6 }}>{t.linkDep}</label>
        <select value={linkRelation} onChange={(e) => setLinkRelation(e.target.value)} style={{ ...inputStyle, width: '100%', cursor: 'pointer', marginBottom: 6 }}>
          <option value="blocked_by">{t.relBlockedBy}</option>
          <option value="blocks">{t.relBlocks}</option>
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={linkOther}
              onChange={(e) => { setLinkOther(e.target.value); setLinkSugOpen(true); }}
              onFocus={() => setLinkSugOpen(true)}
              onBlur={() => setTimeout(() => setLinkSugOpen(false), 150)}
              placeholder={t.otherKeyPh}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
            {linkSugOpen && linkSug.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0, zIndex: 40, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, marginTop: 2, maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.14)' }}>
                {linkSug.map((s) => (
                  <div
                    key={s.key}
                    onMouseDown={(e) => { e.preventDefault(); setLinkOther(s.key); setLinkSugOpen(false); }}
                    style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6, alignItems: 'baseline' }}
                  >
                    <strong>{s.key}</strong>
                    <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button disabled={busy || !linkOther.trim()} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/link`, { relation: linkRelation, otherKey: linkOther.trim() }).then(() => { setLinkOther(''); return refetchLinks(); }))} style={ghostBtn}>{t.apply}</button>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>{t.linkHint}</div>

        {links.length > 0 && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 6 }}>{t.linkCurrent}</div>
            <input value={unlinkReason} onChange={(e) => setUnlinkReason(e.target.value)} placeholder={t.unlinkReasonPh} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 4 }} />
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>{t.unlinkReasonReq}</div>
            {links.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 12.5 }}>
                  <span style={{ color: C.muted }}>{l.depends ? t.linkDependsOn : t.linkRequiredBy} </span>
                  <KeyLink k={l.otherKey} />
                  {l.otherStatus && <span style={{ color: C.muted }}> · {l.otherStatus}</span>}
                </span>
                <button disabled={busy || !unlinkReason.trim()} onClick={() => removeLink(l)} style={{ ...ghostBtn, color: C.red, borderColor: C.red, opacity: unlinkReason.trim() ? 1 : 0.5 }}>{t.removeWord}</button>
              </div>
            ))}
          </div>
        )}
        </>)}

        {/* تعديل الحقول (لتلبية شروط الانتقالات مثل labels) */}
        {tab === 'fields' && (
          <div>
            {editFields.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
            {editFields.map((f) => (
              <div key={f.id} style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: C.muted }}>{f.name}{f.required ? ' *' : ''}</label>
                {f.type === 'array' && f.allowedValues.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {f.allowedValues.map((v) => {
                      const arr = editValues[f.id] || [];
                      const on = arr.includes(v.id);
                      return (
                        <button key={v.id} onClick={() => setEditValues({ ...editValues, [f.id]: on ? arr.filter((x) => x !== v.id) : [...arr, v.id] })} style={on ? { ...ghostBtn, background: C.blue, color: '#fff', border: 0 } : ghostBtn}>{v.label}</button>
                      );
                    })}
                  </div>
                ) : f.allowedValues.length > 0 ? (
                  <select value={editValues[f.id] || ''} onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })} style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                    <option value="">{t.pick}</option>
                    {f.allowedValues.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                ) : (
                  <input value={editValues[f.id] || ''} onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })} placeholder={f.type === 'array' ? t.commaSep : ''} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <button disabled={busy} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/fields`, { fields: buildEditPayload() }))} style={ghostBtn}>{t.apply}</button>
          </div>
        )}

        {/* نقل الحالة */}
        {tab === 'transition' && (<>
        <label style={{ fontSize: 13, color: C.muted, display: 'block' }}>{t.transition}</label>
        {(() => {
          const sel = transitions.find((tr) => tr.id === transitionId);
          const reqFields = sel?.fields || [];
          const missing = reqFields.some((f) => !fieldValues[f.id]);
          // قيمة جاهزة لجيرا: حقول القوائم ترسَل { id }، والنصية كنص
          const buildFields = () => {
            const out = {};
            for (const f of reqFields) {
              const v = fieldValues[f.id];
              if (!v) continue;
              out[f.id] = f.allowedValues.length > 0 ? { id: v } : v;
            }
            return out;
          };
          return (
            <>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={transitionId} onChange={(e) => { setTransitionId(e.target.value); setFieldValues({}); }} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
                  <option value="">{t.pick}</option>
                  {transitions.map((tr) => <option key={tr.id} value={tr.id}>{tr.name}{tr.to ? ` → ${tr.to}` : ''}</option>)}
                </select>
                <button disabled={busy || !transitionId || missing} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/transition`, { transitionId, fields: buildFields() }))} style={ghostBtn}>{t.apply}</button>
              </div>
              {reqFields.map((f) => (
                <div key={f.id} style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 12, color: C.muted }}>{f.name} *</label>
                  {f.allowedValues.length > 0 ? (
                    <select value={fieldValues[f.id] || ''} onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                      <option value="">{t.pick}</option>
                      {f.allowedValues.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  ) : (
                    <input value={fieldValues[f.id] || ''} onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </>
          );
        })()}
        </>)}

        {msg && <div style={{ color: C.green, fontSize: 13, marginTop: 10 }}>{msg}</div>}
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}

// بطاقة استثناء للجوال (بديل صف الجدول)
function ExceptionCard({ it, canManage, canOpen, onAction, onType, inBasket, onBasket }) {
  const { t, fmt, fmtDate, fmtDateTime } = useUI();
  const F = ({ label, children }) => (
    <div style={{ fontSize: 12 }}><span style={{ color: C.muted }}>{label}: </span>{children}</div>
  );
  const fu = it.followup || {};
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {onBasket && (
            <input type="checkbox" checked={!!inBasket} onChange={onBasket} title={inBasket ? t.basketRemoveRow : t.basketAddRow} style={{ cursor: 'pointer' }} />
          )}
          <KeyLink k={it.key} />
        </span>
        {canOpen && <button onClick={() => onAction(it)} style={ghostBtn}>{t.act}</button>}
      </div>
      <div style={{ fontSize: 13, margin: '6px 0', fontWeight: 600 }}>{it.summary}</div>
      {(it.labels || []).length > 0 && (
        <div style={{ marginBottom: 6 }}>{it.labels.map((l) => <Chip key={l} color="#6b7280">{l}</Chip>)}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginBottom: 6 }}>
        <F label={t.thType}>{it.issueType
          ? <span onClick={() => onType?.(it.key)} style={{ cursor: 'pointer', color: C.blue, textDecoration: 'underline' }}>{it.issueType} ⤵</span>
          : '—'}</F>
        <F label={t.fProject}>{it.project}</F>
        <F label={t.thStatus}>{it.status}</F>
        <F label={t.thPriority}>{it.priority}</F>
        <F label={t.thAssignee}>{it.assignee || <span style={{ color: C.red }}>—</span>}</F>
        <F label={t.thDue}>{fmtDate(it.dueDate)}</F>
        <F label={t.thDays}>{fmt(it.daysInStatus)}</F>
        <F label={t.thCreator}>{it.reporter ? `${it.reporter} · ${fmtDateTime(it.createdAt)}` : (it.createdAt ? fmtDateTime(it.createdAt) : '—')}</F>
        <F label={t.thLastActor}>{it.lastActor ? `${it.lastActor} · ${fmtDateTime(it.lastActorAt)}` : (it.lastActorAt ? fmtDateTime(it.lastActorAt) : '—')}</F>
      </div>
      <div>{it.reasons.map((r) => <Chip key={r} color={EXC_COLORS[r]}>{t.exc[r] || r}</Chip>)}</div>
      {canManage && (fu.acknowledged || fu.snoozed || fu.ownerName || fu.rootCause) && (
        <div style={{ marginTop: 4 }}>
          {fu.acknowledged && <Chip color={C.green}>✓ {t.acked}</Chip>}
          {fu.snoozed && <Chip color="#8a96a3">{t.snoozed} {fmtDate(fu.snoozeUntil)}</Chip>}
          {fu.ownerName && <Chip color={C.blue}>{fu.ownerName}</Chip>}
          {fu.rootCause && <Chip color={C.amber}>{t.rc[fu.rootCause] || fu.rootCause}</Chip>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- لوحة المعلومات
// شاشة واحدة تجمع كل العناصر؛ كل عنصر (KPI/أداة) يظهر حسب صلاحية الدور.
function DashboardScreen({ perms = [], userId }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  const has = (k) => perms.includes(k);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [windowDays, setWindowDays] = useState(90);
  const [cols, setCols] = useState({ left: [], right: [] });
  const [dragKey, setDragKey] = useState(null);
  const storeKey = `dash_cols_${userId || 'me'}`;

  useEffect(() => {
    setData(null);
    fetchJson(`/api/analytics/dashboard?days=${windowDays}`).then(setData).catch((e) => setError(e.message));
  }, [windowDays]);

  const KPIS = [
    { perm: 'kpi_total', label: t.sTotal, color: C.blue, val: (d) => d.total },
    { perm: 'kpi_open', label: t.sOpen, color: C.amber, val: (d) => d.open },
    { perm: 'kpi_done', label: t.sDone, color: C.green, val: (d) => d.done },
    { perm: 'kpi_overdue', label: t.cOverdue, color: C.red, val: (d) => d.overdue },
    { perm: 'kpi_unassigned', label: t.cUnassigned, color: C.purple, val: (d) => d.unassigned },
    { perm: 'kpi_stagnant', label: t.cStagnant, color: C.amber, val: (d) => d.stagnant },
    { perm: 'kpi_review', label: t.cReview, color: C.blue, val: (d) => d.review },
    { perm: 'kpi_sla_breached', label: t.sBreached, color: C.red, val: (d) => d.slaBreached },
    { perm: 'kpi_avg_cycle', label: t.sAvgCycle, color: C.purple, val: (d) => d.avgCycle },
    { perm: 'kpi_on_time', label: t.sOnTime, color: C.green, val: (d) => d.onTimePct, suffix: '%', hint: t.sOnTimeHint },
    { perm: 'kpi_sla_compliance', label: t.sSlaCompliance, color: C.blue, val: (d) => d.slaCompliancePct, suffix: '%', hint: t.sSlaComplianceHint },
    { perm: 'kpi_net_flow', label: t.sNetFlow, color: C.amber, val: (d) => d.netFlow, hint: t.sNetFlowHint },
    { perm: 'kpi_unassigned_wait', label: t.sUnassignedWait, color: C.purple, val: (d) => d.unassignedWaitDays, suffix: t.dayUnit, hint: t.sUnassignedWaitHint },
  ];
  const kpiVisible = KPIS.filter((k) => has(k.perm));

  // أي العناصر مرئية لهذا الدور
  const showKpi = kpiVisible.length > 0;
  const showWorkload = has('widget_workload');
  const showWip = has('widget_wip');
  const showThroughput = has('widget_throughput');
  const showTrend = has('widget_trend');
  const showCyclePri = has('widget_cycle_priority');
  const showStage = has('widget_stage_time');
  const showWindow = showWip || showThroughput || showTrend || showCyclePri || showStage;
  const anyWidget = showKpi || showWorkload || showWindow;

  // مفاتيح البطاقات المرئية بالترتيب الافتراضي
  const visibleKeys = [
    showKpi && 'kpi', showWorkload && 'workload', showWip && 'wip',
    showThroughput && 'throughput', showTrend && 'trend',
    showCyclePri && 'cycle_priority', showStage && 'stage',
  ].filter(Boolean);
  const visKeyStr = visibleKeys.join(',');

  // توزيع البطاقات على عمودين: المحفوظ للمستخدم + أي بطاقات جديدة مرئية
  useEffect(() => {
    const keys = visKeyStr ? visKeyStr.split(',') : [];
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(storeKey) || 'null'); } catch { saved = null; }
    let left = [];
    let right = [];
    if (saved && Array.isArray(saved.left) && Array.isArray(saved.right)) {
      left = saved.left.filter((k) => keys.includes(k));
      right = saved.right.filter((k) => keys.includes(k));
      const placed = new Set([...left, ...right]);
      keys.filter((k) => !placed.has(k)).forEach((k) => (left.length <= right.length ? left : right).push(k));
    } else {
      keys.forEach((k, i) => (i % 2 === 0 ? left : right).push(k));
    }
    setCols({ left, right });
  }, [visKeyStr, storeKey]);

  const persist = (next) => { try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* ignore */ } };
  const resetLayout = () => {
    try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
    const keys = visKeyStr ? visKeyStr.split(',') : [];
    const left = []; const right = [];
    keys.forEach((k, i) => (i % 2 === 0 ? left : right).push(k));
    setCols({ left, right });
  };
  // نقل البطاقة المسحوبة إلى عمود — قبل بطاقة محدّدة أو في نهاية العمود (الفراغ)
  const moveCard = (src, targetCol, beforeKey) => {
    if (!src) return;
    setCols((prev) => {
      const left = prev.left.filter((k) => k !== src);
      const right = prev.right.filter((k) => k !== src);
      const dest = targetCol === 'left' ? left : right;
      const idx = beforeKey ? dest.indexOf(beforeKey) : -1;
      if (idx < 0) dest.push(src); else dest.splice(idx, 0, src);
      return { left, right };
    });
  };
  const onDragEnd = () => { setDragKey(null); setCols((c) => { persist(c); return c; }); };

  if (error) return <Screen title={t.navDashboard} hint={t.hDashboard}><ErrorBox message={error} /></Screen>;
  if (!anyWidget) return <Screen title={t.navDashboard} hint={t.hDashboard}><div style={{ color: C.muted, fontSize: 14, padding: 12 }}>{t.noKpi}</div></Screen>;
  if (!data) return <Screen title={t.navDashboard} hint={t.hDashboard}><Loading /></Screen>;

  const maxLoad = Math.max(1, ...((data.workload || []).map((w) => w.openCount)));
  const byPriority = data.cycle?.byPriority || [];
  const stages = data.stages || [];
  const maxCycle = Math.max(1, ...byPriority.map((p) => p.avgDays || 0));
  const maxStage = Math.max(1, ...stages.map((s) => s.avgDays || 0));

  // عقدة كل بطاقة حسب مفتاحها
  const nodes = {
    kpi: { full: true, node: (
      <Screen collapsible title={t.scrKpi} hint={t.hDashboard}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {kpiVisible.map((k) => <StatCard key={k.perm} label={k.label} value={k.val(data.kpis)} color={k.color} suffix={k.suffix} hint={k.hint} />)}
        </div>
      </Screen>
    ) },
    workload: { node: (
      <Screen collapsible title={t.workload} hint={t.hWorkload}>
        {(data.workload || []).map((w) => (
          <BarRow key={w.accountId || w.assignee} label={w.assignee} value={w.openCount} max={maxLoad}
            color={w.overdue > 0 ? C.amber : C.green} suffix={w.overdue > 0 ? t.overdueSuffix(fmt(w.overdue)) : ''} />
        ))}
        {(data.workload || []).length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
      </Screen>
    ) },
    wip: { node: <Screen collapsible title={t.wipOverTime} hint={t.hWip}><WipChart data={data.wip} /></Screen> },
    throughput: { node: <Screen collapsible title={t.throughput} hint={t.hThroughput}><Throughput data={data.throughput} /></Screen> },
    trend: { node: <Screen collapsible title={t.trend} hint={t.hTrend}><TrendChart series={data.trend} /></Screen> },
    cycle_priority: { node: (
      <Screen collapsible title={t.cycleByPriority} hint={t.hCycle}>
        {byPriority.map((p) => <BarRow key={p.priority} label={p.priority} value={p.avgDays || 0} max={maxCycle} color={C.purple} suffix={t.dayUnit} />)}
        {byPriority.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
      </Screen>
    ) },
    stage: { node: (
      <Screen collapsible title={t.stageResidence} hint={t.hCycle}>
        {stages.slice(0, 8).map((s) => <BarRow key={s.stage} label={s.stage} value={s.avgDays || 0} max={maxStage} color={C.blue} suffix={t.dayUnit} />)}
        {stages.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>{t.noStages}</div>}
      </Screen>
    ) },
  };

  const gripStyle = { position: 'absolute', insetInlineEnd: 10, top: 10, zIndex: 5, cursor: 'grab', color: C.muted, fontSize: 15, lineHeight: 1, padding: '3px 7px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card };

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {showWindow && (<>
          <span style={{ fontSize: 13, color: C.muted }}>{t.windowL}:</span>
          {[[30, t.d30], [90, t.d90], [180, t.d180]].map(([d, label]) => (
            <button key={d} onClick={() => setWindowDays(d)} style={windowDays === d ? { ...ghostBtn, background: C.green, color: '#fff', border: 0 } : ghostBtn}>{label}</button>
          ))}
          <span style={{ width: 1, height: 18, background: C.border, margin: '0 4px' }} />
        </>)}
        <span style={{ fontSize: 12.5, color: C.muted }}>⠿ {t.dragHint}</span>
        <button onClick={resetLayout} style={{ ...ghostBtn, marginInlineStart: 'auto' }}>{t.resetLayout}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        {['left', 'right'].map((colId) => (
          <div
            key={colId}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragKey) moveCard(dragKey, colId, null); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 80 }}
          >
            {cols[colId].filter((k) => nodes[k]).map((k) => (
              <div
                key={k}
                onDragEnter={() => { if (dragKey && dragKey !== k) moveCard(dragKey, colId, k); }}
                onDragOver={(e) => e.preventDefault()}
                style={{ position: 'relative', opacity: dragKey === k ? 0.4 : 1, transition: 'opacity .12s' }}
              >
                <div
                  className="no-print"
                  draggable
                  title={t.dragHint}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', k);
                    const card = e.currentTarget.parentElement;
                    if (card) { try { e.dataTransfer.setDragImage(card, 20, 20); } catch { /* ignore */ } }
                    setDragKey(k);
                  }}
                  onDragEnd={onDragEnd}
                  style={gripStyle}
                >⠿</div>
                {nodes[k].node}
              </div>
            ))}
            {/* منطقة إفلات في الفراغ أسفل العمود — لوضع البطاقة هنا */}
            <div
              onDragEnter={() => { if (dragKey) moveCard(dragKey, colId, null); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragKey) moveCard(dragKey, colId, null); }}
              style={{ flex: 1, minHeight: 56, borderRadius: 8, border: dragKey ? `2px dashed ${C.border}` : '2px dashed transparent', transition: 'border-color .12s' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// شريط ترقيم مشترك مع مُحدِّد عدد الصفوف (10/20/50/100) — لكل الجداول.
const PAGE_SIZES = [10, 20, 50, 100];
function PageBar({ page, setPage, pageSize, setPageSize, total }) {
  const { t } = useUI();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, totalPages);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <select
        value={pageSize}
        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        title={t.rowsPerPage}
        aria-label={t.rowsPerPage}
        style={{ border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 13, background: C.card, cursor: 'pointer' }}
      >
        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safe <= 1} style={ghostBtn}>‹ {t.prev}</button>
      <span style={{ fontSize: 13, color: C.muted }}>{t.pageOf(safe, totalPages)}</span>
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safe >= totalPages} style={ghostBtn}>{t.next} ›</button>
    </div>
  );
}

// عقدة في شجرة التذاكر (تُستدعى تكرارياً)
function HierNode({ node, depth }) {
  const { t, fmtDate } = useUI();
  const catColor = { done: C.green, indeterminate: C.amber, new: '#6b7280' }[node.statusCategory] || '#6b7280';
  return (
    <div style={{ marginInlineStart: depth ? 16 : 0, borderInlineStart: depth ? `2px solid ${C.border}` : 'none', paddingInlineStart: depth ? 10 : 0, marginTop: 6 }}>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', background: C.card }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {node.type && <Chip color={C.blue}>{node.type}</Chip>}
          <KeyLink k={node.key} />
          <span style={{ fontWeight: 600 }}>{node.summary}</span>
          {node.status && <Chip color={catColor}>{node.status}</Chip>}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>{t.thAssignee}: {node.assignee || '—'}</span>
          <span>{t.thPriority}: {node.priority || '—'}</span>
          <span>{t.thCreator}: {node.reporter || '—'}</span>
          {node.due && <span>{t.thDue}: {fmtDate(node.due)}</span>}
        </div>
      </div>
      {(node.children || []).map((c) => <HierNode key={c.key} node={c} depth={depth + 1} />)}
    </div>
  );
}

// نافذة شجرة التذاكر (Epic → Task → Subtask) بتفاصيلها.
function HierarchyModal({ issueKey, onClose }) {
  const { t } = useUI();
  const [tree, setTree] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setTree(null); setErr('');
    fetchJson(`/api/tickets/${issueKey}/hierarchy`).then((d) => setTree(d.tree)).catch((e) => setErr(e.message));
  }, [issueKey]);
  const count = (n) => (n ? 1 + (n.children || []).reduce((a, c) => a + count(c), 0) - 1 : 0);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 12, padding: 16, width: 'min(820px, 100%)', marginTop: 24, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>{t.hierTitle} · {issueKey}</strong>
          <button onClick={onClose} style={ghostBtn}>{t.close}</button>
        </div>
        {err && <ErrorBox message={err} />}
        {!tree && !err && <Loading />}
        {tree && (
          (tree.children || []).length === 0
            ? (<><HierNode node={tree} depth={0} /><div style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>{t.hierEmpty}</div></>)
            : <HierNode node={tree} depth={0} />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- العملياتي
function OperationalTab({ screen = 'exceptions' }) {
  const { t, fmt, fmtDate, fmtDateTime, perms, pageSize: defaultPageSize } = useUI();
  const [pageSize, setPageSize] = useState(PAGE_SIZES.includes(defaultPageSize) ? defaultPageSize : 20);
  const isMobile = useIsMobile();
  const canAct = (perms || []).includes('act_tickets');
  const canManage = (perms || []).includes('manage_exceptions');
  const canOpen = canAct || canManage;
  const [actionTicket, setActionTicket] = useState(null);
  const [hierKey, setHierKey] = useState(null);
  const [hideSnoozed, setHideSnoozed] = useState(true);
  const [hideAcked, setHideAcked] = useState(false);
  const [showDone, setShowDone] = useState(false); // إظهار المنجزة في شاشة كل التذاكر
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [allData, setAllData] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // تصنيف النتائج (متعدد الاختيار): مسؤول · مشروع · أولوية · حالة · وسم · نوع
  const [fAssignee, setFAssignee] = useState([]);
  const [fProject, setFProject] = useState([]);
  const [fPriority, setFPriority] = useState([]);
  const [fStatus, setFStatus] = useState([]);
  const [fLabels, setFLabels] = useState([]);
  const [fType, setFType] = useState([]);
  const [fSearch, setFSearch] = useState('');

  // سلّة البحث: مجموعة مفاتيح تذاكر تتراكم — يعرض الجدول تذاكرها فقط.
  const [basket, setBasket] = useState([]);
  const [basketInput, setBasketInput] = useState('');
  const addToBasket = (raw) => {
    // يقبل مفتاحاً واحداً أو عدة مفاتيح مفصولة بمسافة/فاصلة (لاتينية أو عربية)
    const keys = String(raw || '').split(/[\s,،;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (keys.length) setBasket((prev) => Array.from(new Set([...prev, ...keys])));
    setBasketInput('');
  };
  const inBasket = (k) => basket.includes((k || '').toUpperCase());
  const toggleBasket = (k) => {
    const key = (k || '').toUpperCase();
    setBasket((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  // اقتراحات حيّة أثناء الكتابة في سلّة البحث (typeahead عبر /api/tickets/search)
  const [bSug, setBSug] = useState([]);
  const [bOpen, setBOpen] = useState(false);
  const [bActive, setBActive] = useState(-1);
  useEffect(() => {
    const q = basketInput.trim();
    if (q.length < 1) { setBSug([]); setBOpen(false); return undefined; }
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const d = await fetchJson(`/api/tickets/search?q=${encodeURIComponent(q)}`);
        if (!alive) return;
        setBSug(d.items || []);
        setBOpen(true);
        setBActive(-1);
      } catch { if (alive) setBSug([]); }
    }, 200);
    return () => { alive = false; clearTimeout(id); };
  }, [basketInput]);
  const pickSug = (it) => { addToBasket(it.key); setBOpen(false); setBSug([]); setBActive(-1); };
  const onBasketKey = (e) => {
    if (bOpen && bSug.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setBActive((i) => Math.min(i + 1, bSug.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setBActive((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Escape') { setBOpen(false); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (bActive >= 0 && bActive < bSug.length) pickSug(bSug[bActive]);
        else addToBasket(basketInput);
        return;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      addToBasket(basketInput);
    }
  };

  // ترقيم الصفحات (حجم الصفحة من إعدادات الإدارة)
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const openQs = new URLSearchParams(qs);
      if (showDone) openQs.set('includeDone', '1');
      const [exc, all, wl] = await Promise.all([
        fetchJson(`/api/exceptions?${qs.toString()}`),
        fetchJson(`/api/tickets/open?${openQs.toString()}`),
        fetchJson('/api/workload'),
      ]);
      setData(exc);
      setAllData(all);
      setWorkload(wl.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, showDone]);

  useEffect(() => { load(); }, [load]);

  const isAll = screen === 'alltickets';
  const items = (isAll ? allData?.items : data?.items) || [];
  const uniq = (sel) => Array.from(new Set(items.map(sel).filter(Boolean))).sort();
  const opts = useMemo(() => {
    const hasUnassigned = items.some((x) => !x.assignee);
    return {
      // نضيف خيار "بدون مسؤول" في مقدمة قائمة المسؤولين عند وجود تذاكر بلا مُسنَد
      assignees: [...(hasUnassigned ? [UNASSIGNED] : []), ...uniq((x) => x.assignee)],
      projects: uniq((x) => x.project),
      priorities: uniq((x) => x.priority),
      statuses: uniq((x) => x.status),
      types: uniq((x) => x.issueType),
      // كل الوسوم الفريدة عبر التذاكر
      labels: Array.from(new Set(items.flatMap((x) => x.labels || []))).sort(),
    };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = fSearch.trim().toLowerCase();
    return items.filter((x) =>
      (basket.length === 0 || basket.includes((x.key || '').toUpperCase())) &&
      (fAssignee.length === 0
        || fAssignee.includes(x.assignee)
        || (fAssignee.includes(UNASSIGNED) && !x.assignee)) &&
      (fProject.length === 0 || fProject.includes(x.project)) &&
      (fPriority.length === 0 || fPriority.includes(x.priority)) &&
      (fStatus.length === 0 || fStatus.includes(x.status)) &&
      (fLabels.length === 0 || (x.labels || []).some((l) => fLabels.includes(l))) &&
      (fType.length === 0 || fType.includes(x.issueType)) &&
      (!hideSnoozed || !x.followup?.snoozed) &&
      (!hideAcked || !x.followup?.acknowledged) &&
      (q === ''
        || (x.key || '').toLowerCase().includes(q)
        || (x.summary || '').toLowerCase().includes(q)
        || (x.assignee || '').toLowerCase().includes(q))
    );
  }, [items, basket, fAssignee, fProject, fPriority, fStatus, fLabels, fType, hideSnoozed, hideAcked, fSearch]);

  // أعد للصفحة الأولى عند تغيّر الفلاتر أو حجم الصفحة
  useEffect(() => { setPage(1); }, [basket, fAssignee, fProject, fPriority, fStatus, fLabels, fType, hideSnoozed, hideAcked, fSearch, pageSize, items.length, screen]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const maxLoad = Math.max(1, ...(workload || []).map((w) => w.openCount));
  const anyFilter = fAssignee.length || fProject.length || fPriority.length || fStatus.length || fLabels.length || fType.length || fSearch.trim();

  return (
    <>
      {(screen === 'exceptions' || isAll) && (
      <Screen
        title={`${isAll ? t.projectTickets : t.exceptions} · ${t.showing(fmt(filtered.length), fmt(items.length))}`}
        hint={isAll ? t.hAllTickets : t.hExceptions}
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: C.muted }}>{t.from}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
            <span style={{ color: C.muted }}>{t.to}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} style={ghostBtn}>{t.clear}</button>
            )}
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }} title={t.basketHint}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="cart" size={15} /> {t.basketTitle}</span>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <input
              value={basketInput}
              onChange={(e) => setBasketInput(e.target.value)}
              onKeyDown={onBasketKey}
              onFocus={() => { if (bSug.length) setBOpen(true); }}
              onBlur={() => setTimeout(() => setBOpen(false), 150)}
              placeholder={t.basketPlaceholder}
              aria-label={t.basketPlaceholder}
              autoComplete="off"
              style={{ ...inputStyle, minWidth: 240 }}
            />
            {bOpen && bSug.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', insetInlineStart: 0, zIndex: 50, marginTop: 4, minWidth: 320, maxWidth: 460, maxHeight: 280, overflowY: 'auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                {bSug.map((it, i) => (
                  <button
                    key={it.key}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSug(it); }}
                    onMouseEnter={() => setBActive(i)}
                    style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'baseline', textAlign: 'start', padding: '7px 10px', border: 'none', borderBottom: `1px solid ${C.border}`, background: i === bActive ? C.bg : 'transparent', color: C.text, cursor: 'pointer', fontSize: 13 }}
                  >
                    <span style={{ fontWeight: 700, color: inBasket(it.key) ? C.green : C.blue, whiteSpace: 'nowrap' }}>{inBasket(it.key) ? '✓ ' : ''}{it.key}</span>
                    <span style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.summary}</span>
                  </button>
                ))}
              </div>
            )}
          </span>
          <button onClick={() => addToBasket(basketInput)} style={ghostBtn}>+ {t.basketAdd}</button>
          {basket.map((k) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '3px 6px 3px 10px', fontSize: 12 }}>
              {k}
              <button onClick={() => toggleBasket(k)} title={t.basketRemoveRow} style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {basket.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: C.muted }}>· {t.basketCount(fmt(basket.length))}</span>
              <button onClick={() => setBasket([])} style={ghostBtn}>{t.basketClear}</button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <input
            value={fSearch}
            onChange={(e) => setFSearch(e.target.value)}
            placeholder={t.searchTickets}
            aria-label={t.searchTickets}
            style={{ ...inputStyle, minWidth: 200 }}
          />
          <MultiSelect label={t.fAssignee} value={fAssignee} options={opts.assignees} onChange={setFAssignee} labels={{ [UNASSIGNED]: t.cUnassigned }} />
          <MultiSelect label={t.fProject} value={fProject} options={opts.projects} onChange={setFProject} />
          <MultiSelect label={t.fPriority} value={fPriority} options={opts.priorities} onChange={setFPriority} />
          <MultiSelect label={t.fStatus} value={fStatus} options={opts.statuses} onChange={setFStatus} />
          {opts.types.length > 0 && (
            <MultiSelect label={t.fType} value={fType} options={opts.types} onChange={setFType} />
          )}
          {opts.labels.length > 0 && (
            <MultiSelect label={t.fLabel} value={fLabels} options={opts.labels} onChange={setFLabels} />
          )}
          {anyFilter ? (
            <button onClick={() => { setFAssignee([]); setFProject([]); setFPriority([]); setFStatus([]); setFLabels([]); setFType([]); setFSearch(''); }} style={ghostBtn}>{t.clear}</button>
          ) : null}
          {canManage && (
            <>
              <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 13, color: C.muted }}>
                <input type="checkbox" checked={hideSnoozed} onChange={(e) => setHideSnoozed(e.target.checked)} /> {t.hideSnoozed}
              </label>
              <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 13, color: C.muted }}>
                <input type="checkbox" checked={hideAcked} onChange={(e) => setHideAcked(e.target.checked)} /> {t.hideAcked}
              </label>
            </>
          )}
          {isAll && (
            <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 13, color: C.muted }} title={t.showDoneHint}>
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> {t.showDone}
            </label>
          )}
          <button onClick={() => downloadCsv(filtered, t)} style={{ ...ghostBtn, marginInlineStart: 'auto' }}>⬇ {t.exportCsv}</button>
        </div>
        {isMobile ? (
          <div>
            {pageItems.map((it) => (
              <ExceptionCard key={it.id} it={it} canManage={canManage} canOpen={canOpen} onAction={setActionTicket} onType={setHierKey} inBasket={inBasket(it.key)} onBasket={() => toggleBasket(it.key)} />
            ))}
            {filtered.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 16 }}>{isAll ? t.noTickets : t.noExceptions}</div>}
          </div>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th align="center"><Icon name="cart" size={14} /></Th>
                <Th>{t.thKey}</Th>
                <Th>{t.thSummary}</Th>
                <Th>{t.thType}</Th>
                <Th>{t.fProject}</Th>
                <Th>{t.thStatus}</Th>
                <Th>{t.thPriority}</Th>
                <Th>{t.thAssignee}</Th>
                <Th>{t.thCreator}</Th>
                <Th>{t.thLastActor}</Th>
                <Th>{t.thDue}</Th>
                <Th align="center">{t.thDays}</Th>
                <Th>{t.thReasons}</Th>
                {canManage && <Th>{t.followup}</Th>}
                {canOpen && <Th align="center">{t.actions}</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((it) => (
                <tr key={it.id}>
                  <Td align="center">
                    <input
                      type="checkbox"
                      checked={inBasket(it.key)}
                      onChange={() => toggleBasket(it.key)}
                      title={inBasket(it.key) ? t.basketRemoveRow : t.basketAddRow}
                      style={{ cursor: 'pointer' }}
                    />
                  </Td>
                  <Td><KeyLink k={it.key} /></Td>
                  <Td>
                    {it.summary}
                    {(it.labels || []).length > 0 && (
                      <div style={{ marginTop: 4 }}>{it.labels.map((l) => <Chip key={l} color="#6b7280">{l}</Chip>)}</div>
                    )}
                  </Td>
                  <Td>{it.issueType
                    ? <span onClick={() => setHierKey(it.key)} style={{ cursor: 'pointer' }} title={t.hierTitle}><Chip color={C.blue}>{it.issueType} ⤵</Chip></span>
                    : '—'}</Td>
                  <Td>{it.project}</Td>
                  <Td>{it.status}</Td>
                  <Td>{it.priority}</Td>
                  <Td>{it.assignee || <span style={{ color: C.red }}>—</span>}</Td>
                  <Td>
                    {it.reporter ? (
                      <span>{it.reporter}<span style={{ color: C.muted, fontSize: 12 }}> · {fmtDateTime(it.createdAt)}</span></span>
                    ) : (it.createdAt ? fmtDateTime(it.createdAt) : '—')}
                  </Td>
                  <Td>
                    {it.lastActor ? (
                      <span>{it.lastActor}<span style={{ color: C.muted, fontSize: 12 }}> · {fmtDateTime(it.lastActorAt)}</span></span>
                    ) : (it.lastActorAt ? <span style={{ color: C.muted }}>{fmtDateTime(it.lastActorAt)}</span> : '—')}
                  </Td>
                  <Td>{fmtDate(it.dueDate)}</Td>
                  <Td align="center">{fmt(it.daysInStatus)}</Td>
                  <Td>
                    {it.reasons.map((r) => (
                      <Chip key={r} color={EXC_COLORS[r]}>{t.exc[r] || r}</Chip>
                    ))}
                  </Td>
                  {canManage && (
                    <Td>
                      {it.followup?.acknowledged && <Chip color={C.green}>✓ {t.acked}</Chip>}
                      {it.followup?.snoozed && <Chip color="#8a96a3">{t.snoozed} {fmtDate(it.followup.snoozeUntil)}</Chip>}
                      {it.followup?.ownerName && <Chip color={C.blue}>{it.followup.ownerName}</Chip>}
                      {it.followup?.rootCause && <Chip color={C.amber}>{t.rc[it.followup.rootCause] || it.followup.rootCause}</Chip>}
                    </Td>
                  )}
                  {canOpen && (
                    <Td align="center">
                      <button onClick={() => setActionTicket(it)} style={ghostBtn} title={t.actions}>{t.act}</button>
                    </Td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><Td align="center">{isAll ? t.noTickets : t.noExceptions}</Td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* ترقيم الصفحات */}
        {filtered.length > 0 && (
          <PageBar page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} />
        )}
      </Screen>
      )}

      {actionTicket && (
        <TicketActions ticket={actionTicket} onClose={() => setActionTicket(null)} onDone={load} />
      )}

      {hierKey && (
        <HierarchyModal issueKey={hierKey} onClose={() => setHierKey(null)} />
      )}

      {screen === 'workload' && (
      <Screen title={t.workload} hint={t.hWorkload}>
        {(workload || []).map((w) => (
          <BarRow
            key={w.accountId || w.assignee}
            label={w.assignee}
            value={w.openCount}
            max={maxLoad}
            color={w.overdue > 0 ? C.amber : C.green}
            suffix={w.overdue > 0 ? t.overdueSuffix(fmt(w.overdue)) : ''}
          />
        ))}
      </Screen>
      )}
    </>
  );
}

// ------------------------------------------------------------------- الإداري
function ManagerialTab({ screen = 'performance' }) {
  const { t, pageSize: defaultPageSize } = useUI();
  const [pageSize, setPageSize] = useState(PAGE_SIZES.includes(defaultPageSize) ? defaultPageSize : 20);
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [sla, setSla] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [flow, setFlow] = useState(null);
  const [throughput, setThroughput] = useState(null);
  const [wip, setWip] = useState(null);
  const [perf, setPerf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slaPage, setSlaPage] = useState(1);
  const [windowDays, setWindowDays] = useState(90);

  useEffect(() => {
    (async () => {
      try {
        const wk = Math.max(4, Math.ceil(windowDays / 7));
        const [s, tr, sl, c, sc, fl, tp, wp, pf] = await Promise.all([
          fetchJson('/api/analytics/summary'),
          fetchJson(`/api/analytics/trend?days=${windowDays}`),
          fetchJson('/api/analytics/sla-forecast'),
          fetchJson(`/api/analytics/cycle-time?days=${windowDays}`),
          fetchJson('/api/analytics/scorecard'),
          fetchJson('/api/analytics/flow'),
          fetchJson(`/api/analytics/throughput?weeks=${wk}`),
          fetchJson(`/api/analytics/wip?days=${windowDays}`),
          fetchJson(`/api/analytics/performance?days=${windowDays}`),
        ]);
        setSummary(s);
        setTrend(tr.series);
        setSla(sl);
        setCycle(c);
        setScorecard(sc.items);
        setFlow(fl);
        setThroughput(tp);
        setWip(wp);
        setPerf(pf);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [windowDays]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const maxCycle = Math.max(1, ...(cycle?.cycle?.byPriority || []).map((p) => p.avgDays || 0));
  const maxStage = Math.max(1, ...(cycle?.stages || []).map((s) => s.avgDays || 0));
  const atRisk = (sla?.items || []).filter((x) => x.slaStatus !== 'on_track');
  const slaTotalPages = Math.max(1, Math.ceil(atRisk.length / pageSize));
  const slaSafePage = Math.min(slaPage, slaTotalPages);
  const atRiskPage = atRisk.slice((slaSafePage - 1) * pageSize, slaSafePage * pageSize);

  return (
    <>
      <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: C.muted }}>{t.windowL}:</span>
        {[[30, t.d30], [90, t.d90], [180, t.d180]].map(([d, label]) => (
          <button key={d} onClick={() => setWindowDays(d)} style={windowDays === d ? { ...ghostBtn, background: C.green, color: '#fff', border: 0 } : ghostBtn}>{label}</button>
        ))}
        <button onClick={() => window.print()} style={{ ...ghostBtn, marginInlineStart: 'auto' }}>{t.printReport}</button>
      </div>

      {screen === 'performance' && (
      <Screen title={`${t.performance} · ${perf ? t.windowD(perf.windowDays) : ''}`} hint={t.hPerformance}>
        <Performance data={perf} />
      </Screen>
      )}

      {screen === 'scorecard' && (
      <Screen title={t.scorecard} hint={t.hScorecard}>
        <Scorecard items={scorecard} />
      </Screen>
      )}

      {screen === 'flow' && (
      <Screen title={t.flow} hint={t.hFlow}>
        <Flow flow={flow} />
      </Screen>
      )}

      {screen === 'deps' && (
      <Screen title={t.depBottlenecks} hint={t.depHint}>
        <DepBottlenecks flow={flow} />
      </Screen>
      )}

      {screen === 'wip' && (
      <Screen title={t.wipOverTime} hint={t.hWip}>
        <WipChart data={wip} />
      </Screen>
      )}

      {screen === 'throughput' && (
      <Screen title={t.throughput} hint={t.hThroughput}>
        <Throughput data={throughput} />
      </Screen>
      )}

      {screen === 'trend' && (
      <Screen title={t.trend} hint={t.hTrend}>
        <TrendChart series={trend} />
      </Screen>
      )}

      {screen === 'sla' && (
      <div>
        <div>
          <Screen title={t.sla} hint={t.hSla}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatCard label={t.slaState.breached} value={sla.summary.breached} color={C.red} />
              <StatCard label={t.slaState.at_risk} value={sla.summary.at_risk} color={C.amber} />
              <StatCard label={t.slaState.on_track} value={sla.summary.on_track} color={C.green} />
            </div>
            {isMobile ? (
              <div>
                {atRiskPage.map((x) => (
                  <div key={x.key} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <KeyLink k={x.key} />
                      <Chip color={SLA_COLORS[x.slaStatus]}>{t.slaState[x.slaStatus]}</Chip>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      {x.priority} · {t.thRemaining}: <DaysCell value={x.daysRemaining} />
                    </div>
                  </div>
                ))}
                {atRisk.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>{t.noAtRisk}</div>}
              </div>
            ) : (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
              <thead>
                <tr>
                  <Th>{t.thKey}</Th>
                  <Th>{t.thPriority}</Th>
                  <Th align="center">{t.thRemaining}</Th>
                  <Th>{t.thStatus}</Th>
                </tr>
              </thead>
              <tbody>
                {atRiskPage.map((x) => (
                  <tr key={x.key}>
                    <Td><KeyLink k={x.key} /></Td>
                    <Td>{x.priority}</Td>
                    <Td align="center"><DaysCell value={x.daysRemaining} /></Td>
                    <Td><Chip color={SLA_COLORS[x.slaStatus]}>{t.slaState[x.slaStatus]}</Chip></Td>
                  </tr>
                ))}
                {atRisk.length === 0 && <tr><Td align="center">{t.noAtRisk}</Td></tr>}
              </tbody>
            </table>
            </div>
            )}
            {atRisk.length > 0 && (
              <PageBar page={slaPage} setPage={setSlaPage} pageSize={pageSize} setPageSize={setPageSize} total={atRisk.length} />
            )}
          </Screen>
        </div>
      </div>
      )}

      {screen === 'cycle' && (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 340px' }}>
          <Screen title={t.cycleByPriority} hint={t.hCycle}>
            {(cycle?.cycle?.byPriority || []).map((p) => (
              <BarRow key={p.priority} label={p.priority} value={p.avgDays || 0} max={maxCycle} color={C.purple} suffix={t.dayUnit} />
            ))}
          </Screen>
        </div>
        <div style={{ flex: '1 1 340px' }}>
          <Screen title={t.stageResidence} hint={t.hCycle}>
            {(cycle?.stages || []).slice(0, 8).map((s) => (
              <BarRow key={s.stage} label={s.stage} value={s.avgDays || 0} max={maxStage} color={C.blue} suffix={t.dayUnit} />
            ))}
            {(!cycle?.stages || cycle.stages.length === 0) && (
              <div style={{ color: C.muted, fontSize: 13 }}>{t.noStages}</div>
            )}
          </Screen>
        </div>
      </div>
      )}
    </>
  );
}

function DaysCell({ value }) {
  const { fmt } = useUI();
  return <span style={{ color: value < 0 ? C.red : C.text }}>{fmt(value)}</span>;
}

// تقييم الأداء: مسؤولون + مشاريع، مع مؤشّر عام
function scoreColor(s) { return s >= 75 ? C.green : s >= 50 ? C.amber : C.red; }
function ScorePill({ value }) {
  return <span style={{ fontWeight: 700, color: scoreColor(value) }}>{value}</span>;
}
function Performance({ data }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  const [aPage, setAPage] = useState(1);
  const [aSize, setASize] = useState(20);
  const [tPage, setTPage] = useState(1);
  const [tSize, setTSize] = useState(20);
  const [fProj, setFProj] = useState('');
  const [fName, setFName] = useState('');
  const [fEng, setFEng] = useState('');
  if (!data) return <Loading />;

  const F = ({ label, children }) => (<div style={{ fontSize: 12 }}><span style={{ color: C.muted }}>{label}: </span>{children}</div>);
  const engColor = (r) => (r >= 60 ? C.green : r >= 30 ? C.amber : C.red);
  const engLabel = (r) => (r >= 60 ? t.engHigh : r >= 30 ? t.engMid : t.engLow);
  const engCell = (x) => (x.engagementRate == null
    ? <span style={{ color: C.muted }}>—</span>
    : <span title={t.engagementTip}><Chip color={engColor(x.engagementRate)}>{x.engagementRate}% · {engLabel(x.engagementRate)}</Chip></span>);

  const allAssignees = data.assignees || [];
  const allTeams = data.teams || [];
  const projectOpts = Array.from(new Set([
    ...allAssignees.map((x) => x.project).filter(Boolean),
    ...allTeams.map((x) => x.project).filter(Boolean),
  ])).sort();
  const nameQ = fName.trim().toLowerCase();
  const engCat = (r) => (r == null ? null : r >= 60 ? 'high' : r >= 30 ? 'mid' : 'low');
  const assignees = allAssignees.filter((x) =>
    (!fProj || x.project === fProj)
    && (!nameQ || (x.name || '').toLowerCase().includes(nameQ))
    && (!fEng || engCat(x.engagementRate) === fEng));
  const teams = allTeams.filter((x) => !fProj || x.project === fProj);

  const aSafe = Math.min(aPage, Math.max(1, Math.ceil(assignees.length / aSize)));
  const tSafe = Math.min(tPage, Math.max(1, Math.ceil(teams.length / tSize)));
  const aShown = assignees.slice((aSafe - 1) * aSize, aSafe * aSize);
  const tShown = teams.slice((tSafe - 1) * tSize, tSafe * tSize);

  const assigneeCard = (x, i) => (
    <div key={`${x.name}|${x.project}|${i}`} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{x.name} <span style={{ color: C.muted, fontWeight: 400 }}>· {x.project}</span></strong><ScorePill value={x.overall} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginTop: 4 }}>
        <F label={t.colResolved}>{fmt(x.resolved)}</F>
        <F label={t.onTime}>{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</F>
        <F label={t.colCycle}>{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)}${t.dayUnit}`}</F>
        <F label={t.colLoad}>
          {fmt(x.openLoad)} {t.loadOpen}
          {x.stuck > 0 && <span style={{ color: C.amber, fontWeight: 600 }}> · {fmt(x.stuck)} {t.loadStuck}</span>}
        </F>
        <F label={t.engagement}>{engCell(x)}</F>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>{t.perfNote}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select value={fProj} onChange={(e) => { setFProj(e.target.value); setAPage(1); setTPage(1); }} style={inputStyle} aria-label={t.fProject}>
          <option value="">{t.fProject}: {t.all}</option>
          {projectOpts.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={fName} onChange={(e) => { setFName(e.target.value); setAPage(1); }} placeholder={t.fAssignee} style={inputStyle} aria-label={t.fAssignee} />
        <select value={fEng} onChange={(e) => { setFEng(e.target.value); setAPage(1); }} style={inputStyle} aria-label={t.engagement}>
          <option value="">{t.engagement}: {t.all}</option>
          <option value="high">{t.engHigh}</option>
          <option value="mid">{t.engMid}</option>
          <option value="low">{t.engLow}</option>
        </select>
        {(fProj || fName || fEng) && <button onClick={() => { setFProj(''); setFName(''); setFEng(''); }} style={ghostBtn}>{t.clear}</button>}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 6px' }}>{t.perfAssignees}</div>
      {isMobile ? (
        aShown.map(assigneeCard)
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead><tr>
              <Th>{t.thAssignee}</Th><Th>{t.fProject}</Th><Th align="center">{t.score}</Th><Th align="center">{t.colResolved}</Th>
              <Th align="center">{t.onTime}</Th><Th align="center">{t.colCycle}</Th><Th align="center">{t.colLoad}</Th><Th align="center">{t.engagement}</Th>
            </tr></thead>
            <tbody>
              {aShown.map((x, i) => (
                <tr key={`${x.name}|${x.project}|${i}`}>
                  <Td>{x.name}</Td>
                  <Td>{x.project}</Td>
                  <Td align="center"><ScorePill value={x.overall} /></Td>
                  <Td align="center">{fmt(x.resolved)}</Td>
                  <Td align="center">{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</Td>
                  <Td align="center">{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)} ${t.dayUnit}`}</Td>
                  <Td align="center">
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <span>{fmt(x.openLoad)} <span style={{ color: C.muted, fontSize: 11 }}>{t.loadOpen}</span></span>
                      {x.stuck > 0 && <span title={t.loadStuckTip}><Chip color={C.amber}>{fmt(x.stuck)} {t.loadStuck}</Chip></span>}
                    </span>
                  </Td>
                  <Td align="center">{engCell(x)}</Td>
                </tr>
              ))}
              {assignees.length === 0 && <tr><Td align="center">—</Td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {assignees.length > 0 && <PageBar page={aPage} setPage={setAPage} pageSize={aSize} setPageSize={setASize} total={assignees.length} />}

      <div style={{ fontSize: 13, fontWeight: 600, margin: '14px 0 6px' }}>{t.perfTeams}</div>
      {isMobile ? (
        <>
          {tShown.map((x) => (
            <div key={x.project} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{x.project}</strong><ScorePill value={x.overall} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginTop: 4 }}>
                <F label={t.colResolved}>{fmt(x.resolved)}</F>
                <F label={t.onTime}>{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</F>
                <F label={t.colCycle}>{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)}${t.dayUnit}`}</F>
                <F label={t.colPredict}><ScorePill value={x.scores.predictability} /></F>
              </div>
            </div>
          ))}
          {teams.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
        </>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead><tr>
              <Th>{t.fProject}</Th><Th align="center">{t.score}</Th><Th align="center">{t.colResolved}</Th>
              <Th align="center">{t.onTime}</Th><Th align="center">{t.colCycle}</Th><Th align="center">{t.colPredict}</Th>
            </tr></thead>
            <tbody>
              {tShown.map((x) => (
                <tr key={x.project}>
                  <Td><strong>{x.project}</strong></Td>
                  <Td align="center"><ScorePill value={x.overall} /></Td>
                  <Td align="center">{fmt(x.resolved)}</Td>
                  <Td align="center">{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</Td>
                  <Td align="center">{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)} ${t.dayUnit}`}</Td>
                  <Td align="center"><ScorePill value={x.scores.predictability} /></Td>
                </tr>
              ))}
              {teams.length === 0 && <tr><Td align="center">—</Td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {teams.length > 0 && <PageBar page={tPage} setPage={setTPage} pageSize={tSize} setPageSize={setTSize} total={teams.length} />}
    </div>
  );
}

// بطاقة صحة المشاريع (RAG)
function Scorecard({ items }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  const HC = { red: C.red, amber: C.amber, green: C.green };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  if (!items) return <Loading />;
  if (items.length === 0) return <div style={{ color: C.muted, fontSize: 13 }}>—</div>;

  const safePage = Math.min(page, Math.max(1, Math.ceil(items.length / pageSize)));
  const shown = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  const healthBadge = (x) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: HC[x.health], display: 'inline-block' }} />
      {t.healthLabel[x.health]}
    </span>
  );

  if (isMobile) {
    const F = ({ label, children }) => (<div style={{ fontSize: 12 }}><span style={{ color: C.muted }}>{label}: </span>{children}</div>);
    return (
      <div>
        {shown.map((x) => (
          <div key={x.project} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong>{x.project}</strong>
              {healthBadge(x)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
              <F label={t.colOpen}>{fmt(x.openCount)}</F>
              <F label={t.colExc}>{fmt(x.exceptions)}</F>
              <F label={t.colBreach}><span style={{ color: x.breached > 0 ? C.red : C.text }}>{fmt(x.breached)}</span></F>
              <F label={t.onTime}>{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</F>
              <F label={t.colCycle}>{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)}${t.dayUnit}`}</F>
            </div>
          </div>
        ))}
        <PageBar page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={items.length} />
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr>
            <Th>{t.fProject}</Th>
            <Th>{t.health}</Th>
            <Th align="center">{t.colOpen}</Th>
            <Th align="center">{t.colExc}</Th>
            <Th align="center">{t.colBreach}</Th>
            <Th align="center">{t.onTime}</Th>
            <Th align="center">{t.colCycle}</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((x) => (
            <tr key={x.project}>
              <Td><strong>{x.project}</strong></Td>
              <Td>{healthBadge(x)}</Td>
              <Td align="center">{fmt(x.openCount)}</Td>
              <Td align="center">{fmt(x.exceptions)}</Td>
              <Td align="center"><span style={{ color: x.breached > 0 ? C.red : C.text }}>{fmt(x.breached)}</span></Td>
              <Td align="center">{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</Td>
              <Td align="center">{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)} ${t.dayUnit}`}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      <PageBar page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={items.length} />
    </div>
  );
}

// تدفّق العمل عبر الزمن: مساحات متراكمة لأعداد كل حالة (CFD مبسّط)
const WIP_PALETTE = ['#2490ef', '#1f7a4d', '#cb8a14', '#7c4dff', '#e0568b', '#14b8a6', '#8a96a3'];
function WipChart({ data }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  if (!data) return <Loading />;
  const { series = [], statuses = [] } = data;
  if (series.length === 0 || statuses.length === 0) {
    return <div style={{ color: C.muted, fontSize: 13 }}>{t.wipEmpty}</div>;
  }
  const colorOf = (s, i) => (s === 'other' ? '#8a96a3' : WIP_PALETTE[i % WIP_PALETTE.length]);
  const labelOf = (s) => (s === 'other' ? t.wipOther : s);

  const W = 1000, H = 240, padL = 38, padB = 26, padT = 12;
  const n = series.length;
  const totals = series.map((d) => statuses.reduce((a, s) => a + (d[s] || 0), 0));
  const maxTotal = Math.max(1, ...totals);
  const x = (i) => padL + (n === 1 ? (W - padL - 10) / 2 : (i * (W - padL - 10)) / (n - 1));
  const y = (v) => padT + (1 - v / maxTotal) * (H - padT - padB);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxTotal / ticks) * i));

  // قيم متراكمة لكل يوم
  const stacks = series.map((d) => {
    let base = 0;
    return statuses.map((s) => { const v = d[s] || 0; const seg = { s, base, top: base + v }; base += v; return seg; });
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      {series.length < 2 && <div style={{ color: C.amber, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>{t.trendCollecting(series.length)}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: isMobile ? 0 : 600, height: isMobile ? 'auto' : H }}>
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={y(g)} x2={W - 10} y2={y(g)} style={{ stroke: C.border }} strokeDasharray="3 3" opacity="0.6" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize="10" style={{ fill: C.muted }}>{fmt(g)}</text>
          </g>
        ))}
        {statuses.map((s, si) => {
          const tops = stacks.map((segs) => segs[si]);
          const pts = [
            ...tops.map((p, i) => `${x(i)},${y(p.top)}`),
            ...tops.map((p, i) => `${x(i)},${y(p.base)}`).reverse(),
          ].join(' ');
          return <polygon key={s} points={pts} fill={colorOf(s, si)} opacity="0.82" />;
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {statuses.map((s, si) => (
          <span key={s} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 10, background: colorOf(s, si), display: 'inline-block', borderRadius: 2 }} />
            {labelOf(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

// الإنتاجية والتنبؤ: أعمدة المنجَز أسبوعياً + تقديرات استنزاف المتراكم
function Throughput({ data }) {
  const { t, fmt, fmtDate } = useUI();
  if (!data) return <Loading />;
  const maxW = Math.max(1, ...(data.series || []).map((w) => w.count));
  const fcLine = (label, count, f, color) => (
    <div style={{ fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: C.muted }}>{label} ({fmt(count)}): </span>
      {f.weeks == null
        ? <span style={{ color: C.muted }}>{t.noForecast}</span>
        : <span style={{ color }}>{t.atPace} · {fmt(f.weeks)} {t.weeksUnit} · {t.byDate} {fmtDate(f.date)}</span>}
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
        {t.weeklyDone} · {t.avgWeekly}: <strong style={{ color: C.text }}>{fmt(data.avgWeekly)}</strong>
      </div>
      {(data.series || []).map((w) => (
        <BarRow key={w.week} label={fmtDate(w.week)} value={w.count} max={maxW} color={C.green} />
      ))}
      {(!data.series || data.series.length === 0) && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}

      <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        {fcLine(t.fcOpen, data.backlog.open, data.forecast.open, C.amber)}
        {fcLine(t.fcOverdue, data.backlog.overdue, data.forecast.overdue, C.red)}
        {fcLine(t.fcBreach, data.backlog.breached, data.forecast.breached, C.red)}
      </div>
    </div>
  );
}

// تدفّق العمل: WIP حسب المرحلة (أعمدة) + جدول أقدم العالقين
// صفّ اختناق اعتمادية: التذكرة الحاجبة — بالنقر تظهر التذاكر المتوقّفة بسببها.
function DepRow({ d, ageColor }) {
  const { t, fmt } = useUI();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderInlineStart: `3px solid ${C.red}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', cursor: 'pointer' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 11, color: C.muted, width: 12 }}>{open ? '▾' : '▸'}</span>
          <KeyLink k={d.key} />
          <Chip color={C.red}>{t.blocksCount(fmt(d.blockingCount))}</Chip>
        </span>
        <span style={{ fontSize: 12, color: ageColor(d.daysInStatus), fontWeight: 700 }}>{fmt(d.daysInStatus)} {t.dayUnit}</span>
      </div>
      <div onClick={() => setOpen((v) => !v)} style={{ fontSize: 13, margin: '4px 0', cursor: 'pointer' }}>{d.summary}</div>
      <div style={{ fontSize: 12, color: C.muted }}>{d.project} · {d.status} · {d.assignee || '—'}</div>
      {open && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{t.blockedList} ({fmt(d.blockedKeys.length)}):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
            {d.blockedKeys.map((k) => <KeyLink key={k} k={k} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// سجلّ الاعتماديات المُلغاة (للمراجعة) — صلاحية مخصّصة.
function DependencyLog() {
  const { t, fmtDateTime, perms } = useUI();
  const isMobile = useIsMobile();
  const canAct = (perms || []).includes('act_tickets');
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const load = () => fetchJson('/api/analytics/dependency-log').then((d) => setItems(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const undo = async (id) => {
    setBusy(id); setErr('');
    try {
      const res = await fetch('/api/analytics/dependency-log/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'error');
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(0); }
  };
  const undoBtn = (r) => (r.removed && canAct
    ? <button disabled={busy === r.id} onClick={() => undo(r.id)} style={{ ...ghostBtn, color: C.green, borderColor: C.green }}>{busy === r.id ? '…' : t.dlUndo}</button>
    : null);
  if (err && !items) return <Screen title={t.depLog} hint={t.depLogHint}><ErrorBox message={err} /></Screen>;
  if (!items) return <Screen title={t.depLog} hint={t.depLogHint}><Loading /></Screen>;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return (
    <Screen title={t.depLog} hint={t.depLogHint}>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>{err}</div>}
      {items.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 13, padding: 8 }}>{t.noDepLog}</div>
      ) : isMobile ? (
        pageItems.map((r, i) => (
          <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><KeyLink k={r.blocker} /> → <KeyLink k={r.blocked} /></span>
              <Chip color={r.source === 'manual' ? C.blue : '#8a96a3'}>{r.source === 'manual' ? t.srcManual : t.srcAuto}</Chip>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.project} · {r.status || '—'} · {fmtDateTime(r.clearedAt)}{r.actor ? ` · ${r.actor}` : ''}</div>
            {r.reason && <div style={{ fontSize: 12, marginTop: 4 }}>{t.dlReason}: {r.reason}</div>}
            {undoBtn(r) && <div style={{ marginTop: 8 }}>{undoBtn(r)}</div>}
          </div>
        ))
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 740 }}>
            <thead><tr>
              <Th>{t.dlBlocker}</Th><Th>{t.dlBlocked}</Th><Th align="center">{t.dlSource}</Th>
              <Th>{t.dlActor}</Th><Th>{t.dlWhen}</Th><Th>{t.dlReason}</Th><Th align="center">{t.dlAction}</Th>
            </tr></thead>
            <tbody>
              {pageItems.map((r, i) => (
                <tr key={i}>
                  <Td><KeyLink k={r.blocker} /></Td>
                  <Td><KeyLink k={r.blocked} /></Td>
                  <Td align="center"><Chip color={r.source === 'manual' ? C.blue : '#8a96a3'}>{r.source === 'manual' ? t.srcManual : t.srcAuto}</Chip></Td>
                  <Td>{r.actor || '—'}</Td>
                  <Td>{fmtDateTime(r.clearedAt)}</Td>
                  <Td>{r.reason || '—'}</Td>
                  <Td align="center">{undoBtn(r) || (r.removed ? '—' : <span style={{ color: C.muted }}>{t.dlKept}</span>)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length > 0 && (
        <PageBar page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={items.length} />
      )}
    </Screen>
  );
}

// شاشة مستقلّة لاختناقات الاعتمادية (نفس بيانات flow.dependencies) مع حالة فارغة موضِّحة.
function DepBottlenecks({ flow }) {
  const { t } = useUI();
  if (!flow) return <Loading />;
  const ageColor = (d) => (d > 14 ? C.red : d > 7 ? C.amber : C.green);
  const deps = flow.dependencies || [];
  if (deps.length === 0) {
    return (
      <div style={{ color: C.muted, fontSize: 14, padding: '8px 4px', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 600 }}>{t.noDeps}</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>{t.depEmptyHint}</div>
      </div>
    );
  }
  return <div>{deps.map((d) => <DepRow key={d.key} d={d} ageColor={ageColor} />)}</div>;
}

function Flow({ flow }) {
  const { t, fmt, fmtDate } = useUI();
  const isMobile = useIsMobile();
  const [agingPage, setAgingPage] = useState(1);
  const [agingPageSize, setAgingPageSize] = useState(10);
  if (!flow) return <Loading />;
  const ageColor = (d) => (d > 14 ? C.red : d > 7 ? C.amber : C.green);
  const maxWip = Math.max(1, ...(flow.wip || []).map((w) => w.count));
  const agingAll = flow.aging || [];
  const agingTotalPages = Math.max(1, Math.ceil(agingAll.length / agingPageSize));
  const agingSafePage = Math.min(agingPage, agingTotalPages);
  const aging = agingAll.slice((agingSafePage - 1) * agingPageSize, agingSafePage * agingPageSize);
  const bn = flow.bottleneck;
  return (
    <div>
      {bn && (
        <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}44`, borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          <strong style={{ color: C.red }}>⛔ {t.bottleneck}:</strong> {bn.stage}
          <span style={{ color: C.muted }}> — {fmt(bn.count)} {t.items}
            {bn.avgAge != null ? ` · ${t.avgAgeLabel} ${fmt(bn.avgAge)}${t.dayUnit}` : ''}
            {bn.maxAge != null ? ` · ${t.maxAgeLabel} ${fmt(bn.maxAge)}${t.dayUnit}` : ''}
            {bn.stuck ? ` · ${fmt(bn.stuck)} ${t.stuckLabel}` : ''}
          </span>
        </div>
      )}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{t.wipByStage}</div>
      {(flow.wip || []).map((w) => (
        <BarRow
          key={w.stage}
          label={bn && w.stage === bn.stage
            ? <span>{w.stage} <Chip color={C.red}>{t.bottleneckTag}</Chip></span>
            : w.stage}
          value={w.count}
          max={maxWip}
          color={bn && w.stage === bn.stage ? C.red : ageColor(w.avgAge || 0)}
          suffix={`${w.avgAge != null ? ` · ${fmt(w.avgAge)}${t.dayUnit}` : ''}${w.stuck ? ` · ${fmt(w.stuck)} ${t.stuckLabel}` : ''}`}
        />
      ))}

      {(flow.projectBottlenecks || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{t.projectBottlenecks}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {flow.projectBottlenecks.map((p) => (
              <span key={p.project} style={{ fontSize: 12.5, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 9px' }}>
                <strong>{p.project}</strong> → {p.stage} <span style={{ color: C.muted }}>({fmt(p.count)} · {fmt(p.avgAge)}{t.dayUnit})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: C.muted, margin: '14px 0 6px' }}>{t.agingWip}</div>
      {isMobile ? (
        <div>
          {aging.map((x) => (
            <div key={x.key} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <KeyLink k={x.key} />
                <span style={{ color: ageColor(x.daysInStatus), fontWeight: 700 }}>{fmt(x.daysInStatus)} {t.dayUnit}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {x.project} · {x.status} · {x.assignee || '—'}
              </div>
            </div>
          ))}
          {aging.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
        </div>
      ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              <Th>{t.thKey}</Th>
              <Th>{t.fProject}</Th>
              <Th>{t.thStatus}</Th>
              <Th>{t.thAssignee}</Th>
              <Th align="center">{t.ageDays}</Th>
            </tr>
          </thead>
          <tbody>
            {aging.map((x) => (
              <tr key={x.key}>
                <Td><KeyLink k={x.key} /></Td>
                <Td>{x.project}</Td>
                <Td>{x.status}</Td>
                <Td>{x.assignee || '—'}</Td>
                <Td align="center"><span style={{ color: ageColor(x.daysInStatus), fontWeight: 600 }}>{fmt(x.daysInStatus)}</span></Td>
              </tr>
            ))}
            {aging.length === 0 && <tr><Td align="center">—</Td></tr>}
          </tbody>
        </table>
      </div>
      )}
      {agingAll.length > 0 && (
        <PageBar page={agingPage} setPage={setAgingPage} pageSize={agingPageSize} setPageSize={setAgingPageSize} total={agingAll.length} />
      )}
    </div>
  );
}

// رسم الاتجاه (SVG، بلا مكتبات): خطوط · مساحات متراكمة · أعمدة متراكمة
function TrendChart({ series }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  const [type, setType] = useState('area');
  if (!series || series.length === 0) {
    return <div style={{ color: C.muted, fontSize: 13 }}>{t.trendEmpty}</div>;
  }
  const W = 1000;
  const H = 240;
  const padL = 38;
  const padB = 26;
  const padT = 12;
  const keys = ['overdue', 'stagnant', 'review', 'unassigned'];
  const n = series.length;
  const totals = series.map((d) => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const stacked = type !== 'lines';
  const maxVal = stacked
    ? Math.max(1, ...totals)
    : Math.max(1, ...series.flatMap((d) => keys.map((k) => d[k] || 0)));

  const x = (i) => padL + (n === 1 ? (W - padL - 10) / 2 : (i * (W - padL - 10)) / (n - 1));
  const y = (v) => padT + (1 - v / maxVal) * (H - padT - padB);

  // خطوط الشبكة الأفقية + قيمها
  const ticks = 4;
  const gridlines = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal / ticks) * i));

  // قيم متراكمة لكل يوم (للمساحات/الأعمدة)
  const stacks = series.map((d) => {
    let base = 0;
    return keys.map((k) => { const v = d[k] || 0; const seg = { k, base, top: base + v }; base += v; return seg; });
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}>
        {[['area', t.chartArea], ['bars', t.chartBars], ['lines', t.chartLines]].map(([k, label]) => (
          <button key={k} onClick={() => setType(k)} style={{ ...ghostBtn, ...(type === k ? { background: C.green, color: '#fff', border: 0 } : {}) }}>{label}</button>
        ))}
      </div>
      {series.length < 2 && (
        <div style={{ color: C.amber, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
          {t.trendCollecting(series.length)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: isMobile ? 0 : 600, height: isMobile ? 'auto' : H }}>
        {/* الشبكة */}
        {gridlines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={y(g)} x2={W - 10} y2={y(g)} style={{ stroke: C.border }} strokeDasharray="3 3" opacity="0.6" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize="10" style={{ fill: C.muted }}>{fmt(g)}</text>
          </g>
        ))}

        {type === 'lines' && keys.map((k) => (
          <g key={k}>
            <polyline points={series.map((d, i) => `${x(i)},${y(d[k] || 0)}`).join(' ')} fill="none" stroke={EXC_COLORS[k]} strokeWidth="2" />
            {series.map((d, i) => <circle key={i} cx={x(i)} cy={y(d[k] || 0)} r="2.2" fill={EXC_COLORS[k]} />)}
          </g>
        ))}

        {type === 'area' && keys.map((k, ki) => {
          const tops = stacks.map((segs) => segs[ki]);
          const pts = [
            ...tops.map((p, i) => `${x(i)},${y(p.top)}`),
            ...tops.map((p, i) => `${x(i)},${y(p.base)}`).reverse(),
          ].join(' ');
          return <polygon key={k} points={pts} fill={EXC_COLORS[k]} opacity="0.82" />;
        })}

        {type === 'bars' && stacks.map((segs, i) => {
          const bw = Math.max(2, ((W - padL - 10) / n) * 0.7);
          return (
            <g key={i}>
              {segs.map((s) => (
                <rect key={s.k} x={x(i) - bw / 2} y={y(s.top)} width={bw} height={Math.max(0, y(s.base) - y(s.top))} fill={EXC_COLORS[s.k]} />
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {keys.map((k) => (
          <span key={k} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 10, background: EXC_COLORS[k], display: 'inline-block', borderRadius: 2 }} />
            {t.exc[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 13, fontFamily: 'inherit' };
const ghostBtn = { border: `1px solid ${C.border}`, background: C.card, borderRadius: 5, padding: '5px 10px', fontSize: 13, cursor: 'pointer' };
