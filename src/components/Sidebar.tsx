import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { SafeImage } from './SafeImage';

const THUMBNAIL_LIMIT = 7;
const CONTINENT_ORDER = ['Africa', 'Asia', 'Europe', 'N.America', 'S.America', 'Oceania'];
const hasLocalImage = (image: string) => image.startsWith('/images/sites/');
const preferredThumbnailItems = <T extends { image: string }>(items: T[], limit = THUMBNAIL_LIMIT) => {
  const localItems = items.filter((item) => hasLocalImage(item.image));
  if (localItems.length >= limit) return localItems.slice(0, limit);
  return [...localItems, ...items.filter((item) => !hasLocalImage(item.image)).slice(0, Math.max(limit - localItems.length, 0))].slice(0, limit);
};

const ThumbnailStack = ({
  items,
  total,
  selectedSiteId,
  hoveredSiteId,
  onItemHover,
  onItemLeave,
  onItemSelect,
}: {
  items: Array<{ id: string; image: string; title: string; subtitle: string; category: 'Cultural' | 'Natural' | 'Mixed' }>;
  total: number;
  selectedSiteId?: string | null;
  hoveredSiteId?: string | null;
  onItemHover?: (id: string) => void;
  onItemLeave?: () => void;
  onItemSelect?: (id: string) => void;
}) => {
  const visibleItems = items.slice(0, THUMBNAIL_LIMIT);
  const remainingCount = Math.max(total - visibleItems.length, 0);

  return (
    <div className="mt-3 flex items-center overflow-hidden">
      <div className="flex min-w-0 items-center">
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            onMouseEnter={(event) => {
              event.stopPropagation();
              onItemHover?.(item.id);
            }}
            onMouseLeave={(event) => {
              event.stopPropagation();
              onItemLeave?.();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onItemSelect?.(item.id);
            }}
            className={`relative h-9 w-9 cursor-pointer overflow-hidden rounded-full bg-white/10 transition-[border-color,box-shadow,transform] ${
              index === 0 ? '' : '-ml-2.5'
            } ${
              selectedSiteId === item.id
                ? 'z-20 border border-white/55 shadow-[0_0_0_2px_rgba(255,255,255,0.18)]'
                : hoveredSiteId === item.id
                  ? 'z-10 border border-white/45 shadow-[0_0_0_2px_rgba(255,255,255,0.12)]'
                  : 'border border-white/25'
            }`}
          >
            <SafeImage
              src={item.image}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              title={item.title}
              subtitle={item.subtitle}
              category={item.category}
              variant="thumb"
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="-ml-2.5 flex h-9 min-w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 px-2 text-[11px] font-semibold text-white/75">
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
};

const yearValue = (year: string) => {
  const value = Number.parseInt(year, 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

export const Sidebar = () => {
  const {
    selectedContinent,
    setSelectedContinent,
    selectedCountry,
    setSelectedCountry,
    sites,
    selectedSiteId,
    hoveredSiteId,
    setSelectedSiteId,
    setHoveredSiteId,
  } = useStore();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const continents = React.useMemo(
    () => CONTINENT_ORDER.filter((continent) => sites.some((site) => site.continent === continent)),
    [sites],
  );

  const continentStats = React.useMemo(
    () =>
      continents.map((continent) => {
        const continentSites = sites.filter((site) => site.continent === continent);
        const preferredSites = [...continentSites].sort((left, right) => {
          const imageDelta = Number(hasLocalImage(right.image)) - Number(hasLocalImage(left.image));
          if (imageDelta !== 0) return imageDelta;
          return yearValue(left.year) - yearValue(right.year) || left.name.localeCompare(right.name);
        });
        return {
          continent,
          siteCount: continentSites.length,
          thumbnails: preferredThumbnailItems(
            preferredSites.map((site) => ({
              id: site.id,
              image: site.image,
              title: site.name,
              subtitle: site.country,
              category: site.category,
            })),
            THUMBNAIL_LIMIT,
          ),
        };
      }),
    [continents, sites],
  );

  const countries = React.useMemo(() => {
    if (!selectedContinent) return [];

    return Array.from(
      new Set(sites.filter((site) => site.continent === selectedContinent).map((site) => site.country)),
    ).sort((left, right) => {
      const leftCount = sites.filter((site) => site.country === left).length;
      const rightCount = sites.filter((site) => site.country === right).length;
      return rightCount - leftCount || left.localeCompare(right);
    });
  }, [selectedContinent, sites]);

  const countryStats = React.useMemo(
    () =>
      countries.map((country) => {
        const countrySites = sites.filter((site) => site.country === country);
        const preferredSites = [...countrySites].sort((left, right) => {
          const imageDelta = Number(hasLocalImage(right.image)) - Number(hasLocalImage(left.image));
          if (imageDelta !== 0) return imageDelta;
          return yearValue(left.year) - yearValue(right.year) || left.name.localeCompare(right.name);
        });

        return {
          country,
          siteCount: countrySites.length,
          thumbnails: preferredThumbnailItems(
            preferredSites.map((site) => ({
              id: site.id,
              image: site.image,
              title: site.name,
              subtitle: `${site.year} · ${site.category}`,
              category: site.category,
            })),
            THUMBNAIL_LIMIT,
          ),
        };
      }),
    [countries, sites],
  );

  const filteredSites = React.useMemo(() => {
    const base = sites.filter((site) => {
      if (selectedCountry) return site.country === selectedCountry;
      if (selectedContinent) return site.continent === selectedContinent;
      return true;
    });

    return [...base].sort((left, right) => yearValue(left.year) - yearValue(right.year) || left.name.localeCompare(right.name));
  }, [selectedContinent, selectedCountry, sites]);

  const title = selectedCountry || selectedContinent || 'World';
  const subtitle = selectedCountry ? 'Country' : selectedContinent ? 'Continent' : 'Global Map';

  const showBreadcrumbs = Boolean(selectedContinent || selectedCountry);

  const collapseSidebar = () => setIsCollapsed(true);
  const expandSidebar = () => setIsCollapsed(false);

  const resetToWorld = () => {
    setSelectedSiteId(null);
    setSelectedCountry(null);
    setSelectedContinent(null);
  };

  const backToContinent = () => {
    setSelectedSiteId(null);
    setSelectedCountry(null);
  };

  return (
    <div className="fixed bottom-4 left-4 top-4 z-40 pointer-events-none">
      <AnimatePresence mode="wait" initial={false}>
        {isCollapsed ? (
          <motion.div
            key="collapsed-sidebar"
            initial={{ x: -32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            className="h-auto pointer-events-auto"
          >
            <button
              onClick={expandSidebar}
              className="group flex cursor-pointer items-center gap-3 rounded-full border border-white/14 bg-black/55 px-4 py-3 text-left shadow-2xl backdrop-blur-xl transition-all hover:border-white/24 hover:bg-black/70"
              aria-label="Expand sidebar"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/6 text-white/80 transition-colors group-hover:text-white">
                <ChevronRight size={16} />
              </span>
              <div className="pr-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/48">Explorer</p>
                <p className="text-sm font-medium text-white">Expand</p>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded-sidebar"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="pointer-events-auto flex h-full w-80 flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl italic text-white">{title}</h2>
                <p className="text-[10px] uppercase tracking-widest text-white/56">{subtitle}</p>
              </div>
              <button
                onClick={collapseSidebar}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-xs text-white/72 transition-colors hover:text-white"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={14} />
                Collapse
              </button>
            </div>

            {showBreadcrumbs ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-white/58">
                <button onClick={resetToWorld} className="cursor-pointer transition-colors hover:text-white">
                  World
                </button>
                {selectedContinent && (
                  <>
                    <span className="text-white/30">/</span>
                    {selectedCountry ? (
                      <button onClick={backToContinent} className="cursor-pointer transition-colors hover:text-white">
                        {selectedContinent}
                      </button>
                    ) : (
                      <span className="text-white/78">{selectedContinent}</span>
                    )}
                  </>
                )}
                {selectedCountry && (
                  <>
                    <span className="text-white/30">/</span>
                    <span className="text-white/78">{selectedCountry}</span>
                  </>
                )}
              </div>
            ) : null}

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {!selectedContinent && (
                <div className="space-y-2 pt-1">
                  {continentStats.map(({ continent, siteCount, thumbnails }) => (
                    <div
                      key={continent}
                      onClick={() => setSelectedContinent(continent)}
                      className="group w-full cursor-pointer rounded-2xl border border-white/12 bg-white/8 p-4 text-left transition-all hover:border-white/22 hover:bg-white/11"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedContinent(continent);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-white">{continent}</span>
                        <span className="text-white/30 transition-colors group-hover:text-white/65">{siteCount}</span>
                      </div>
                      <ThumbnailStack
                        items={thumbnails}
                        total={siteCount}
                        selectedSiteId={selectedSiteId}
                        hoveredSiteId={hoveredSiteId}
                        onItemHover={setHoveredSiteId}
                        onItemLeave={() => setHoveredSiteId(null)}
                        onItemSelect={setSelectedSiteId}
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedContinent && !selectedCountry && (
                <div className="space-y-2">
                  {countryStats.map(({ country, siteCount, thumbnails }) => (
                    <div
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className="group w-full cursor-pointer rounded-2xl border border-white/12 bg-white/8 p-4 text-left transition-all hover:border-white/22 hover:bg-white/11"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedCountry(country);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-white">{country}</span>
                        <span className="text-white/30 transition-colors group-hover:text-white/65">{siteCount}</span>
                      </div>
                      <ThumbnailStack
                        items={thumbnails}
                        total={siteCount}
                        selectedSiteId={selectedSiteId}
                        hoveredSiteId={hoveredSiteId}
                        onItemHover={setHoveredSiteId}
                        onItemLeave={() => setHoveredSiteId(null)}
                        onItemSelect={setSelectedSiteId}
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedCountry && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {filteredSites.map((site) => (
                      <motion.div
                        key={site.id}
                        onMouseEnter={() => setHoveredSiteId(site.id)}
                        onMouseLeave={() => setHoveredSiteId(null)}
                        onClick={() => setSelectedSiteId(selectedSiteId === site.id ? null : site.id)}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all ${
                          selectedSiteId === site.id
                            ? 'border-white/28 bg-white/14'
                            : hoveredSiteId === site.id
                              ? 'border-white/18 bg-white/10'
                              : 'border-white/12 bg-white/8 hover:border-white/22 hover:bg-white/11'
                        }`}
                      >
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                          <SafeImage
                            src={site.image}
                            alt={site.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            title={site.name}
                            subtitle={`${site.year} · ${site.category}`}
                            category={site.category}
                            variant="thumb"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-xs font-medium text-white">{site.name}</h3>
                            {hasLocalImage(site.image) && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                                Real
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-white/56">
                            {site.year} · {site.category}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
