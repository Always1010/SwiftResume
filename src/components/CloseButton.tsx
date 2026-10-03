export function CloseButton({ onClick, label = "关闭", disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return <button type="button" className="close-button" onClick={onClick} aria-label={label} title={label} disabled={disabled}><span aria-hidden="true">×</span></button>;
}
