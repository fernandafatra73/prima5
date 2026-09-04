interface PlaceholderTopicPageProps {
  readonly icon: string;
  readonly title: string;
}

/** Halaman placeholder untuk topik edukasi trading — konten menyusul. */
export function PlaceholderTopicPage({ icon, title }: PlaceholderTopicPageProps) {
  return (
    <div>
      <h2 style={{ margin: '0 0 0.35rem' }}>
        {icon} {title}
      </h2>
      <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Konten belum tersedia.</p>
    </div>
  );
}
