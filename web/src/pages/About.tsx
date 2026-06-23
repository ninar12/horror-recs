export function AboutPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--term-bright)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">

        {/* Header */}
        <div>
          <h1 className="font-['VT323'] text-3xl sm:text-5xl lg:text-6xl text-black leading-none tracking-widest">
            REELSCREAM
          </h1>
          <p className="text-black/50 font-mono text-xs mt-1 sm:mt-2">
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
            {" "}— AI Solutions Architect at Guess
          </p>
          <p className="mt-3">
            I basically only watch horror, thriller, and disturbing niche movies. I'm always on {" "}
            <a
              href="https://letterboxd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
            >
              Letterboxd
            </a>
            {" "}searching for the best new horror or thriller movie to watch. I want things that are unseen, unique, and have a good atmosphere.
            ReelScream started as a personal gripe because of modern-day decision fatigue; there are too many choices available and I 
            like to watch things strictly based on my mood. There are movies that maybe are technically niche, but amongst horror-obsessed people,
            they may be considered not niche at all. Tubi recommendations and Letterboxd recs were pretty good, and looking at tiktoks about movie recs, 
            but I still was doing internal calculations about where the movie can be watched, and my metric of if a letterboxd score is over 3.0 I will probably enjoy it.
            I still wanted a way to use my tech skills to find movies that are truly niche and not just
            surfacing the same films over. I could never be bored trying to solve this problem honestly.
          </p>
          <p className="mt-3">
            So I built this to combine the things I care about — horror, obscurity, the art of horror movies and aesthetics and AI —
            into one tool that actually finds films worth watching and has a randomization feature. The niche score is
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

        {/* Features Grid */}
        <div>
          <h2 className="font-['VT323'] text-lg sm:text-xl lg:text-2xl text-black tracking-widest mb-3 sm:mb-4 pb-1 border-b border-black/20">
            FEATURES
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FeatureCard
              icon="💀"
              title="NICHE SCORE"
              description="Every film gets a 1–10 obscurity rating. DEEP CUT (8–10) are genuinely under-the-radar. CULT PICK (6–7) have a devoted following. HIDDEN GEM (4–5) are underseen relative to quality. Measure how obscure a film is relative to the entire library."
              large
            />
            <FeatureCard
              icon="🎬"
              title="MOOD SEARCH"
              description="Describe your vibe—'something unsettling' becomes a precise horror-theory search. The AI understands mood, not just keywords."
            />
            <FeatureCard
              icon="📸"
              title="IMAGE SEARCH"
              description="Upload photos (fog, brutalism, red skies) and let Gemini Vision read them as atmosphere prompts. Up to 5 images synthesized into one query."
            />
            <FeatureCard
              icon="⭐"
              title="RATINGS"
              description="See scores from IMDb and Letterboxd on every film. Colour-coded—green is good, yellow is mixed, red is rough. Links go directly to source."
            />
          </div>
        </div>

        {/* How search works */}
        <Section title="HOW SEARCH WORKS">
          <p>
            When you type a query, it gets matched against a library of{" "}
            <Highlight>9,536 horror films</Highlight> using semantic search —
            meaning it understands meaning and mood, not just keywords.
            Searching "lonely farmhouse dread" finds films that feel that way,
            even if those words don't appear anywhere in the title or description.
          </p>
          <p className="mt-3">
            Results are then re-ranked by an AI that reads your query and each
            candidate film and writes a one-sentence explanation of why each one fits.
            That explanation is the <Highlight>italicised line</Highlight> you
            see when you open a film.
          </p>
          <p className="mt-3">
            <strong>Find similar</strong> — open any film and scroll down to see
            films with the same tone, atmosphere, and sensibility. Not just the same
            genre — the same <em>feeling</em>.
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
      <h2 className="font-['VT323'] text-lg sm:text-xl lg:text-2xl text-black tracking-widest mb-2 sm:mb-3 pb-1 border-b border-black/20">
        {title}
      </h2>
      <div className="text-black/70 text-xs sm:text-sm leading-relaxed">
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

function FeatureCard({
  icon, title, description, large,
}: {
  icon: string; title: string; description: string; large?: boolean;
}) {
  return (
    <div className={`p-3 sm:p-4 border-2 border-black bg-white hover:bg-black/5 transition-colors ${large ? "sm:col-span-2" : ""}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <span className={`${large ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"} leading-none shrink-0`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`font-['VT323'] ${large ? "text-lg sm:text-2xl" : "text-base sm:text-lg"} text-black tracking-wider`}>{title}</h3>
          <p className="text-xs sm:text-sm text-black/70 leading-relaxed mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
