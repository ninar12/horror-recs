export function AboutPage() {
  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12 space-y-6 sm:space-y-10 lg:space-y-12">

        {/* Header */}
        <div>
          <h1 className="font-['VT323'] text-3xl sm:text-5xl lg:text-6xl xl:text-7xl text-[#00ff00] leading-none tracking-widest">
            REELSCREAM
          </h1>
          <p className="text-[#00ff00]/60 font-mono text-xs sm:text-sm mt-1 sm:mt-2">
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
              className="font-bold text-[#00ff00] underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Nina Rhone
            </a>
            {" "}— AI Solutions Architect at Guess
          </p>
          <p>
            I basically only watch horror, thriller, and disturbing niche movies. I'm always on {" "}
            <a
              href="https://letterboxd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#00ff00] underline underline-offset-2 hover:opacity-70 transition-opacity"
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
          <p>
            So I built this to combine the things I care about — horror, obscurity, the art of horror movies and aesthetics and AI —
            into one tool that actually finds films worth watching and has a randomization feature. The niche score is
            basically my taste encoded as a number.
          </p>
          <p>
            Designed and coded with the help of{" "}
            <a
              href="https://claude.ai/code"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#00ff00] underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Claude Code
            </a>
            {" "}by Anthropic.
          </p>
          <p className="font-mono text-xs text-[#00ff00]/50">
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
          <h2 className="font-['VT323'] text-lg sm:text-xl lg:text-2xl xl:text-3xl text-[#00ff00] tracking-widest mb-3 sm:mb-4 lg:mb-5 pb-2 border-b border-[#00ff00]/30">
            FEATURES
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
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

        {/* Example Search */}
        <div>
          <h2 className="font-['VT323'] text-lg sm:text-xl lg:text-2xl xl:text-3xl text-[#00ff00] tracking-widest mb-3 sm:mb-4 lg:mb-5 pb-2 border-b border-[#00ff00]/30">
            EXAMPLE SEARCH
          </h2>
          <div className="bg-black/60 border border-[#00ff00]/40 p-4 sm:p-5 lg:p-6 mb-4 sm:mb-5">
            <p className="font-mono text-xs sm:text-sm text-[#00ff00]/70 mb-2">&gt; query:</p>
            <p className="text-lg sm:text-xl text-[#00ff00] font-['VT323'] tracking-wider mb-4">
              lonely farmhouse southern gothic country dread and slow burn
            </p>
            <div className="space-y-3">
              <ExampleResult
                title="We Are Still Here"
                year="2015"
                niche="DEEP CUT"
                imdb="6.9"
                letterboxd="3.8"
                why="Isolated New England farmhouse, creeping dread, perfectly paced slow burn with 70s atmosphere"
              />
              <ExampleResult
                title="The House of the Devil"
                year="2009"
                niche="DEEP CUT"
                imdb="6.6"
                letterboxd="3.7"
                why="Gorgeous dread built in solitary farmhouse, meticulous pacing, unsettling mood throughout"
              />
              <ExampleResult
                title="When Animals Dream"
                year="2014"
                niche="HIDDEN GEM"
                imdb="6.4"
                letterboxd="3.5"
                why="Rural Danish gothic, family horror on isolated property, methodical tension building"
              />
            </div>
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
    <section className="border border-[#00ff00]/30 p-4 sm:p-5 lg:p-6 bg-black">
      <h2 className="font-['VT323'] text-lg sm:text-xl lg:text-2xl xl:text-3xl text-[#00ff00] tracking-widest mb-3 sm:mb-4 lg:mb-5 pb-2 border-b border-[#00ff00]/30">
        {title}
      </h2>
      <div className="text-[#00ff00]/80 text-xs sm:text-sm lg:text-base leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono font-bold text-[#00ff00]">{children}</span>
  );
}

function FeatureCard({
  icon, title, description, large,
}: {
  icon: string; title: string; description: string; large?: boolean;
}) {
  return (
    <div className={`p-3 sm:p-4 lg:p-5 border-2 border-[#00ff00]/60 bg-black hover:bg-[#00ff00]/5 transition-colors ${large ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
        <span className={`${large ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl lg:text-4xl"} leading-none shrink-0`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`font-['VT323'] ${large ? "text-lg sm:text-2xl lg:text-3xl" : "text-base sm:text-lg lg:text-xl"} text-[#00ff00] tracking-wider`}>{title}</h3>
          <p className="text-xs sm:text-sm lg:text-base text-[#00ff00]/70 leading-relaxed mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ExampleResult({
  title, year, niche, imdb, letterboxd, why,
}: {
  title: string; year: string; niche: string; imdb: string; letterboxd: string; why: string;
}) {
  return (
    <div className="border border-[#00ff00]/30 p-3 sm:p-4 bg-black/40">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h4 className="font-['VT323'] text-sm sm:text-base text-[#00ff00]">{title}</h4>
          <p className="text-xs text-[#00ff00]/60 font-mono">{year}</p>
        </div>
        <span
          className="text-[9px] font-mono px-2 py-1 border border-[#00ff00]/60 text-[#00ff00] whitespace-nowrap shrink-0"
          style={{ backgroundColor: "rgba(0, 255, 0, 0.05)" }}
        >
          {niche}
        </span>
      </div>
      <p className="text-xs sm:text-sm text-[#00ff00]/80 leading-relaxed mb-2 italic">{why}</p>
      <div className="flex gap-4 text-xs font-mono">
        <span className="text-[#00ff00]/60">IMDb <span className="text-[#00ff00]">{imdb}</span></span>
        <span className="text-[#00ff00]/60">Letterboxd <span className="text-[#00ff00]">{letterboxd}</span></span>
      </div>
    </div>
  );
}
