'use client'

const GENRES = [
  'qualquer', 'ação', 'RPG', 'estratégia', 'aventura',
  'terror', 'indie', 'simulação', 'luta', 'puzzle',
]

interface Props {
  selected: string
  onChange: (genre: string) => void
}

export default function GenrePills({ selected, onChange }: Props) {
  return (
    <div className="genre-pills">
      {GENRES.map((g) => (
        <button
          key={g}
          className={`pill ${selected === g ? 'active' : ''}`}
          onClick={() => onChange(g)}
        >
          {g}
        </button>
      ))}
    </div>
  )
}
