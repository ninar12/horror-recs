export function AboutPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--term-bright)]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div>
          <h1 className="font-['VT323'] text-6xl text-black leading-none tracking-widest">
            REELSCREAM
          </h1>
          <p className="text-black/50 font-mono text-xs mt-1">
            // AI-powered horror film discovery · v1.0
          </p>
        </div>

        {/* Bio — first */}
        <Section title="MADE BY">
          <p>
            Built by{" "}
            <a
              href="https://github.com/ninarhone"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
            >
              Nina Rhone
            </a>
            {" "}— Applied AI Architect at GUESS?, Inc.
          </p>
          <p className="mt-3">
            I basically only watch horror movies. I'm also a{" "}
            <a
              href="https://letterboxd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
            >
              Letterboxd
            </a>
            {" "}obsessive — it's the best thing to happen to film culture on the internet.
            ReelScream started as a personal problem: I'd spend longer picking something
            to watch than actually watching it, and every recommendation engine kept
            surfacing the same 40 films I'd already seen.
          </p>
          <p className="mt-3">
            So I built this to combine the things I care about — horror, obscurity, and AI —
            into one tool that actually finds films worth watching. The niche score is
            basically my taste encoded as a number.
          </p>
          <p className="mt-3">
            Designed and coded with the help of{" "}
            <a
              href="https://claude.ai/code"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
            >
              Claude Code
            </a>
            {" "}by Anthropic.
          </p>
          <p className="mt-4 font-mono text-xs text-black/40">
            // film data via TMDb · ratings via IMDb, Rotten Tomatoes, Letterboxd
            <br />
            // embeddings via Pinecone · AI reranking via Gemini 2.5 Flash
          </p>
        </Section>

        {/* What it is */}
        <Section title="WHAT IS THIS">
          <p>
            ReelScream is a horror film search engine that understands <em>vibes</em>,
            not just titles. Instead of searching for a film you already know,
            you describe what you're in the mood for — and it finds things that actually match.
          </p>
          <p className="mt-3">
            It's specifically tuned to surface films you've probably never heard of.
            If it recommends something you've already seen, that's a bug.
          </p>
        </Section>

        {/* How search works */}
        <Section title="HOW SEARCH WORKS">
          <p>
            When you type a query, it gets matched against a library of{" "}
            <Highlight>9,000+ horror films</Highlight> using semantic search —
            meaning it understands meaning and mood, not just keywords.
            Searching "lonely farmhouse dread" finds films that feel that way,
            even if those words don't appear anywhere in the title or description.
          </p>
          <p className="mt-3">
            Results are then re-ranked by an AI that reads your query and each
            candidate film and writes a one-sentence explanation of why each one fits.
            That explanation is the <Highlight>// italicised line</Highlight> you
            see when you open a card.
          </p>
          <p className="mt-3">
            <strong>Mood mode</strong> takes it further — your vibe gets expanded
            into a richer search query before anything is looked up, so "something
            that will actually disturb me" becomes a precise horror-theory description
            of what disturbing cinema looks like.
          </p>
        </Section>

        {/* Niche score */}
        <Section title="THE NICHE SCORE">
          <p>
            Every film has a <Highlight>niche score from 1–10</Highlight>.
            It measures how obscure a film is relative to everything else in the library.
          </p>
          <div className="mt-4 space-y-2">
            <ScoreTier color="#cc44ff" label="DEEP CUT" range="8–10">
              Genuinely under-the-radar. Most people in a room of horror fans
              will not have seen this. These are the films ReelScream exists to surface.
            </ScoreTier>
            <ScoreTier color="#4488ff" label="CULT PICK" range="6–7">
              Known in the right circles. Has a devoted following but never
              crossed into mainstream awareness.
            </ScoreTier>
            <ScoreTier color="var(--term-dark)" label="HIDDEN GEM" range="4–5">
              Underseen relative to how good it is. You may have heard of it
              but probably haven't watched it.
            </ScoreTier>
            <ScoreTier color="black" label="(no badge)" range="1–3">
              Mainstream picks. Still relevant if your query matches — but you've
              probably already seen these.
            </ScoreTier>
          </div>
          <p className="mt-4">
            The score is based on real audience data — how many people have
            actually seen and rated the film. A film can have a great score
            and a low niche rating, or a terrible score and a high one.
            Niche is not the same as quality.
          </p>
          <p className="mt-3">
            The niche slider in the search panel lets you set a floor —
            drag it right to filter out anything too mainstream.
          </p>
        </Section>

        {/* Ratings */}
        <Section title="THE CONSENSUS SCORE">
          <p>
            The number shown next to each film title combines three sources
            into a single <Highlight>0–10 consensus score</Highlight>:
          </p>
          <div className="mt-3 space-y-1.5 font-mono text-sm">
            <div className="flex justify-between border-b border-black/10 pb-1">
              <span className="text-black/70">IMDb rating</span>
              <span className="text-black/40">30%</span>
            </div>
            <div className="flex justify-between border-b border-black/10 pb-1">
              <span className="text-black/70">Rotten Tomatoes Tomatometer</span>
              <span className="text-black/40">35%</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-black/70">Letterboxd average rating</span>
              <span className="text-black/40">35%</span>
            </div>
          </div>
          <p className="mt-3">
            If a source is missing for a film, the remaining two are
            re-weighted between themselves. The colour coding is simple:
            {" "}<span className="font-mono" style={{ color: "#4caf50" }}>green</span> is good (7+),{" "}
            <span className="font-mono" style={{ color: "#f9a825" }}>yellow</span> is mixed (5–7),{" "}
            <span className="font-mono" style={{ color: "#e53935" }}>red</span> is rough (under 5).
          </p>
        </Section>

        {/* Shuffle */}
        <Section title="THE SHUFFLE BUTTON">
          <p>
            Can't decide what to watch? Hit the shuffle button next to the search bar.
            It picks a random deep-cut query from a curated list — things like
            "forgotten 70s occult horror" or "cosmic horror unknowable entity" —
            and runs a full search automatically. No thinking required.
          </p>
          <p className="mt-3">
            It's the feature you use at 11pm when you've been scrolling for 20 minutes
            and just need someone to decide for you.
          </p>
        </Section>

      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-['VT323'] text-2xl text-black tracking-widest mb-3 pb-1 border-b border-black/20">
        {title}
      </h2>
      <div className="text-black/70 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono font-bold text-black">{children}</span>
  );
}

function ScoreTier({
  color, label, range, children,
}: {
  color: string; label: string; range: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 mt-0.5">
        <span
          className="text-[9px] font-mono px-1.5 py-px border whitespace-nowrap"
          style={{ color, borderColor: color, backgroundColor: "rgba(0,0,0,0.06)" }}
        >
          {label} {range}
        </span>
      </div>
      <p className="text-sm text-black/60 leading-snug">{children}</p>
    </div>
  );
}
