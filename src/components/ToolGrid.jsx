import ToolCard from './ToolCard.jsx'

export default function ToolGrid({ tools, teamsById, isFavorite, onToggleFavorite, onOpen }) {
  return (
    <div className="grid">
      {tools.map((tool, i) => (
        <ToolCard
          key={tool.id}
          // Staggers the entrance across the grid. Capped so a long list
          // doesn't leave the last cards waiting noticeably.
          index={Math.min(i, 8)}
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
