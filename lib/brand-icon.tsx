// Shared mark for the generated favicon/apple-touch-icon/manifest icons —
// a plain "T" on the app's signature accent gradient, full-bleed (no
// rounding) so Android/iOS can apply their own icon masking on top.
export function brandIcon(fontSize: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #7c5cff 0%, #9d7bff 100%)",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        T
      </span>
    </div>
  );
}
