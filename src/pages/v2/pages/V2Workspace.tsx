import type { V2PageId } from '../constants'
import { DynamicsPage, MapsPage, OrganizationPage, RecordsPage, ResponsePage, TasksPage } from './fieldPages'
import { PlanPage, ResourcesPage, SurroundingsPage, TransportPage } from './paperPages'
import { ApprovalPage, AssemblyPage, BriefsPage, DocumentsPage, EventsPage, ForcesPage, OrdersPage, ReturnPage, SummaryPage, SuppliesPage } from './rosterPages'

export function V2Workspace({
  page,
  onNavigate,
  onOpenReport,
  onGenerateReport,
}: {
  page: V2PageId
  onNavigate: (page: V2PageId) => void
  onOpenReport: (id: string) => void
  onGenerateReport?: () => void
}) {
  switch (page) {
    case 'events': return <EventsPage onNavigate={onNavigate} />
    case 'surroundings': return <SurroundingsPage onGenerateReport={onGenerateReport} />
    case 'resources': return <ResourcesPage />
    case 'response': return <ResponsePage />
    case 'orders': return <OrdersPage />
    case 'assembly': return <AssemblyPage onGenerateAssembly={onGenerateReport} />
    case 'approval': return <ApprovalPage />
    case 'transport': return <TransportPage onGenerate={onGenerateReport} />
    case 'documents': return <DocumentsPage />
    case 'organization': return <OrganizationPage />
    case 'maps': return <MapsPage />
    case 'plan': return <PlanPage onGeneratePlan={onGenerateReport} />
    case 'forces': return <ForcesPage />
    case 'tasks': return <TasksPage />
    case 'dynamics': return <DynamicsPage onOpenReport={onOpenReport} onGenerate={onGenerateReport} />
    case 'supplies': return <SuppliesPage onVerify={onGenerateReport} />
    case 'briefs': return <BriefsPage />
    case 'return': return <ReturnPage />
    case 'records': return <RecordsPage />
    case 'summary': return <SummaryPage onGenerate={onGenerateReport} />
    default: return <ResourcesPage />
  }
}
