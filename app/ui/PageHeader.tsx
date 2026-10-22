import { H1, PAGE_SUBTITLE } from './theme'

/** Title and the one-paragraph brief every page opens with. */
export function PageHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <h1 className={H1}>{title}</h1>
      {children && <p className={PAGE_SUBTITLE}>{children}</p>}
    </div>
  )
}
