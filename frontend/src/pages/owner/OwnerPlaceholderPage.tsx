type OwnerPlaceholderPageProps = {
  title: string;
  description: string;
};

export default function OwnerPlaceholderPage({
  title,
  description,
}: OwnerPlaceholderPageProps) {
  return (
    <section
      style={{
        padding: "24px",
        background: "#ffffff",
        borderRadius: "18px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          color: "#111827",
          fontSize: "28px",
          fontWeight: 900,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          color: "#4b5563",
          fontSize: "15px",
          fontWeight: 700,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </section>
  );
}