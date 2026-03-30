import React from 'react';
import { useStore } from '../store';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const THUMBNAIL_LIMIT = 7;

const ThumbnailStack = ({ images, total }: { images: string[]; total: number }) => {
  const visibleImages = images.slice(0, THUMBNAIL_LIMIT);
  const remainingCount = Math.max(total - visibleImages.length, 0);

  return (
    <div className="mt-3 flex items-center overflow-hidden">
      <div className="flex min-w-0 items-center">
        {visibleImages.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className={`h-9 w-9 overflow-hidden rounded-full border border-white/25 bg-white/10 ${
              index === 0 ? '' : '-ml-2.5'
            }`}
          >
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
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

export const Sidebar = () => {
  const {
    selectedContinent,
    setSelectedContinent,
    selectedCountry,
    setSelectedCountry,
    sites,
    selectedSiteId,
    setSelectedSiteId,
  } = useStore();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const continents = Array.from(new Set(sites.map((site) => site.continent))).sort();
  const countries = selectedContinent
    ? Array.from(
        new Set(sites.filter((site) => site.continent === selectedContinent).map((site) => site.country)),
      ).sort()
    : [];

  const filteredSites = sites.filter((site) => {
    if (selectedCountry) return site.country === selectedCountry;
    if (selectedContinent) return site.continent === selectedContinent;
    return true;
  });

  const title = selectedCountry || selectedContinent || 'World Heritage';
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
    <div className="fixed left-4 top-4 bottom-4 z-40 pointer-events-none">
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
                <p className="text-sm font-medium text-white">{title}</p>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded-sidebar"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="flex h-full w-80 flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm pointer-events-auto"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
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
                收起
              </button>
            </div>

            <div className="mb-5 min-h-7">
              {showBreadcrumbs ? (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/58">
                  <button
                    onClick={resetToWorld}
                    className="cursor-pointer transition-colors hover:text-white"
                  >
                    World
                  </button>
                  {selectedContinent && (
                    <>
                      <span className="text-white/30">/</span>
                      {selectedCountry ? (
                        <button
                          onClick={backToContinent}
                          className="cursor-pointer transition-colors hover:text-white"
                        >
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
              ) : (
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Browse by region</p>
              )}
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {!selectedContinent && (
                <div className="space-y-2">
                  {continents.map((continent) => (
                  <button
                    key={continent}
                    onClick={() => setSelectedContinent(continent)}
                      className="group w-full cursor-pointer rounded-2xl border border-white/12 bg-white/8 p-4 text-left transition-all hover:border-white/22 hover:bg-white/11"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-white">{continent}</span>
                      <span className="text-white/30 transition-colors group-hover:text-white/65">
                        {sites.filter((site) => site.continent === continent).length}
                      </span>
                    </div>
                    <ThumbnailStack
                      images={sites
                        .filter((site) => site.continent === continent)
                        .map((site) => site.image)}
                      total={sites.filter((site) => site.continent === continent).length}
                    />
                  </button>
                ))}
              </div>
            )}

              {selectedContinent && !selectedCountry && (
                <div className="space-y-2">
                  {countries.map((country) => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                      className="group w-full cursor-pointer rounded-2xl border border-white/12 bg-white/8 p-4 text-left transition-all hover:border-white/22 hover:bg-white/11"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-white">{country}</span>
                      <span className="text-white/30 transition-colors group-hover:text-white/65">
                        {sites.filter((site) => site.country === country).length}
                      </span>
                    </div>
                    <ThumbnailStack
                      images={sites
                        .filter((site) => site.country === country)
                        .map((site) => site.image)}
                      total={sites.filter((site) => site.country === country).length}
                    />
                  </button>
                ))}
              </div>
            )}

              {selectedCountry && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {filteredSites.map((site) => (
                      <motion.div
                        key={site.id}
                        whileHover={{ x: 4 }}
                        onClick={() => setSelectedSiteId(selectedSiteId === site.id ? null : site.id)}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all ${
                          selectedSiteId === site.id
                            ? 'border-white/28 bg-white/14'
                            : 'border-white/12 bg-white/8 hover:border-white/22 hover:bg-white/11'
                        }`}
                      >
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                          <img
                            src={site.image}
                            alt={site.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xs font-medium text-white">{site.name}</h3>
                          <p className="text-[10px] text-white/56">
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
