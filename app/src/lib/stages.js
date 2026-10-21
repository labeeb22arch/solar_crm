// Project stages — the ONE place they are defined. To use Sunpay's own stages later, edit this list
// (ids are stored on each customer, so keep an id when only renaming a stage).
import {
  IconUsers, IconClock, IconPackage, IconTool, IconFileText, IconSend, IconGauge, IconBolt, IconMapPin, IconClipboardCheck, IconCircleCheck,
} from '@tabler/icons-react';

export const STAGES = [
  { id: 'leads', label: 'Leads', icon: IconUsers },
  { id: 'pending_loans', label: 'Pending Loans/Advances', icon: IconClock },
  { id: 'material_procurement', label: 'Material Procurement', icon: IconPackage },
  { id: 'pending_installation', label: 'Pending Installation', icon: IconTool },
  { id: 'post_installation_docs', label: 'Post-Installation Docs', icon: IconFileText },
  { id: 'discom_submissions', label: 'DISCOM Submissions', icon: IconSend },
  { id: 'meter_installation', label: 'Meter Installation', icon: IconGauge },
  { id: 'system_commissioning', label: 'System Commissioning', icon: IconBolt },
  { id: 'meter_flag', label: 'Meter Flag', icon: IconMapPin },
  { id: 'discom_inspection', label: 'DISCOM Inspection', icon: IconClipboardCheck },
  { id: 'completed', label: 'Completed', icon: IconCircleCheck },
];
export const STAGE_IDS = STAGES.map((s) => s.id);
export const stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
export const stageIndex = (id) => Math.max(0, STAGE_IDS.indexOf(id));
