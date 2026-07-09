import { Alert } from 'antd'

interface ErrorNoticeProps {
  error: string | null
  onClose: () => void
}

export function ErrorNotice({ error, onClose }: ErrorNoticeProps): React.JSX.Element | null {
  if (!error) return null
  return (
    <Alert
      closable
      className="error-notice"
      message={error}
      showIcon
      type="error"
      onClose={onClose}
    />
  )
}
