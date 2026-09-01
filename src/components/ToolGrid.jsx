import ToolCard from './ToolCard.jsx'

export default function ToolGrid({ tools, teamsById, isFavorite, onToggleFavorite, onOpen }) {
  return (
    <div className="grid">
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          team={teamsById[tool.team]}
          isFavorite={isFavorite(tool.id)}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
