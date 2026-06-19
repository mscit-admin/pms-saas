'use client';

import JiraExceptionMonitor from '@/components/JiraExceptionMonitor';

// الواجهة تتغذّى بالكامل من مسارات /api (لا اتصال بجيرا من المتصفح).
export default function Page() {
  return <JiraExceptionMonitor />;
}
