import { cn } from "../../lib/utils";

export default function FloatingInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  ...rest
}) {
  return (
    <label className="group relative block">
      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder=" "
        className={cn(
          "peer h-14 w-full rounded-2xl border border-white/18 bg-white/10 px-4 pt-5 text-sm text-white outline-none backdrop-blur",
          "transition duration-300 placeholder:text-transparent focus:border-white/45 focus:bg-white/12",
        )}
        {...rest}
      />
      <span
        className={cn(
          "pointer-events-none absolute left-4 origin-left text-sm text-white/60 transition-all duration-300",
          value ? "top-2 scale-90 text-white/70" : "top-4",
          "peer-focus:top-2 peer-focus:scale-90 peer-focus:text-white/70",
        )}
      >
        {label}
      </span>
    </label>
  );
}
