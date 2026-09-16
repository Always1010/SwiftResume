import { useState } from "react";

export const PHOTO_BACKGROUND_OPTIONS = [
  { label: "透明", value: "transparent" },
  { label: "白色", value: "#FFFFFF" },
  { label: "蓝色", value: "#438EDB" },
  { label: "浅蓝", value: "#DCEEFF" },
  { label: "红色", value: "#D94141" },
  { label: "浅灰", value: "#F2F4F7" },
] as const;

interface PhotoBackgroundPickerProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  disabled?: boolean;
  label?: string;
}

function BackgroundOptions({ value, onChange, onSelect }: PhotoBackgroundPickerProps & { onSelect?: () => void }) {
  const customColor = /^#[0-9a-f]{6}$/i.test(value) ? value : "#FFFFFF";
  return (
    <div className="photo-background-options" role="group" aria-label="头像底色选项">
      {PHOTO_BACKGROUND_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          className={`${option.value === "transparent" ? "transparent-grid" : ""} ${value === option.value ? "selected" : ""}`}
          style={option.value === "transparent" ? undefined : { backgroundColor: option.value }}
          aria-label={`${option.label}背景`}
          aria-pressed={value === option.value}
          title={option.label}
          onClick={() => { onChange(option.value); onSelect?.(); }}
        />
      ))}
      <label className="photo-custom-color" title="自定义背景色">
        <input
          type="color"
          value={customColor}
          aria-label="自定义头像背景色"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <span>自定义</span>
      </label>
    </div>
  );
}

export function PhotoBackgroundPicker({ value, onChange, compact = false, disabled = false, label = "头像底色" }: PhotoBackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  if (!compact) {
    return (
      <div className="photo-background-picker">
        <span className="photo-background-label">{label}</span>
        <BackgroundOptions value={value} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className={`photo-background-picker compact ${open ? "open" : ""}`}>
      <button
        type="button"
        className="photo-background-trigger"
        disabled={disabled}
        aria-expanded={open}
        title={disabled ? "请先上传头像" : "切换头像底色"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`photo-background-current ${value === "transparent" ? "transparent-grid" : ""}`} style={value === "transparent" ? undefined : { backgroundColor: value }} />
        {label}
      </button>
      {open && !disabled && (
        <div className="photo-background-popover">
          <strong>{label}</strong>
          <BackgroundOptions value={value} onChange={onChange} onSelect={() => setOpen(false)} />
          <p>底色只会显示在头像的透明区域。</p>
        </div>
      )}
    </div>
  );
}
