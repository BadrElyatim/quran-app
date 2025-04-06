import React, { useEffect, useState, useRef } from "react";
import { TOTAL_SURAHS, TAJWEED_RULES } from "../constants";
import VerseNumber from "./VerseNumber";
import QuranAudioPlayer from "./QuranAudioPlayer";
import TajweedSettings from "./TajweedSettings";

const QuranPage = () => {
  const [surahNumber, setSurahNumber] = useState(1);
  const [surahData, setSurahData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reciterId, setReciterId] = useState(7); // Default to Mishari Rashid al-`Afasy
  const [reciters, setReciters] = useState([]);
  const [translationId, setTranslationId] = useState(131); // Default to Saheeh International
  const [translations, setTranslations] = useState([]);
  const [showTranslation, setShowTranslation] = useState(true);
  const [tajweedRules, setTajweedRules] = useState(TAJWEED_RULES);

  // Audio ref for individual verse playback
  const verseAudioRef = useRef(new Audio());

  // Audio ref for full surah playback
  const audioRef = useRef(new Audio());
  
  // Cache for verse audio URLs
  const [verseUrls, setVerseUrls] = useState({});
  // Track which verse is being played individually
  const [individualVersePlayback, setIndividualVersePlayback] = useState(null);

  // Generate style tag content for tajweed rules
  const generateTajweedStyles = () => {
    return tajweedRules.map(rule => {
      return rule.enabled
        ? `.${rule.id} { color: ${rule.color}; }`
        : `.${rule.id} { color: inherit; }`;
    }).join('\n');
  };

  // Toggle a single tajweed rule
  const handleToggleTajweedRule = (ruleId) => {
    setTajweedRules(prevRules =>
      prevRules.map(rule =>
        rule.id === ruleId
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    );
  };

  // Toggle all tajweed rules
  const handleToggleAllTajweedRules = (enabledState) => {
    setTajweedRules(prevRules =>
      prevRules.map(rule => ({ ...rule, enabled: enabledState }))
    );
  };

  // Load reciters and translations on initial load
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // Fetch available reciters
        const recitersResponse = await fetch('https://api.quran.com/api/v4/resources/recitations?language=en');
        if (recitersResponse.ok) {
          const recitersData = await recitersResponse.json();
          setReciters(recitersData.recitations);
        }

        // Fetch available translations
        const translationsResponse = await fetch('https://api.quran.com/api/v4/resources/translations');
        if (translationsResponse.ok) {
          const translationsData = await translationsResponse.json();
          setTranslations(translationsData.translations);
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };

    fetchMetadata();
  }, []);

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      verseAudioRef.current.pause();
      audioRef.current.pause();
    };
  }, []);

  // Set up audio end event listener for individual verse playback
  useEffect(() => {
    const audio = verseAudioRef.current;

    const handleEnded = () => {
      setIndividualVersePlayback(null);
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Load surah data when surah number or translations change
  useEffect(() => {
    const fetchSurahData = async () => {
      setLoading(true);

      try {
        // Fetch surah information
        const surahInfoResponse = await fetch(`https://api.quran.com/api/v4/chapters/${surahNumber}?language=en`);
        if (!surahInfoResponse.ok) {
          throw new Error('Failed to fetch surah info');
        }
        const surahInfo = await surahInfoResponse.json();

        // Fetch Arabic text directly
        const arabicTextResponse = await fetch(
          `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surahNumber}`
        );
        if (!arabicTextResponse.ok) {
          throw new Error('Failed to fetch Arabic text');
        }
        const arabicTextData = await arabicTextResponse.json();

        // Fetch translation
        let translationData = null;
        if (showTranslation) {
          const translationResponse = await fetch(
            `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${surahNumber}`
          );
          if (translationResponse.ok) {
            translationData = await translationResponse.json();
          } else {
            console.error("Failed to fetch translation");
          }
        }

        // Get information about the verses in this surah
        const versesInfoResponse = await fetch(
          `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=en&fields=verse_number&page=1&per_page=300`
        );
        if (!versesInfoResponse.ok) {
          throw new Error('Failed to fetch verse info');
        }
        const versesInfoData = await versesInfoResponse.json();

        // Combine the data
        const processedData = {
          name: surahInfo.chapter.name_arabic,
          englishName: surahInfo.chapter.translated_name.name,
          count: versesInfoData.pagination.total_records,
          verses: arabicTextData.verses.map(verse => {
            const verseNumber = parseInt(verse.verse_key.split(':')[1]);
            let translation = null;

            if (translationData && translationData.translations) {
              const translationItem = translationData.translations.find((t, i) =>
                t.resource_id === translationId && i === verseNumber - 1
              );
              translation = translationItem ? translationItem.text : null;
            }

            return {
              id: verseNumber,
              verseNumber: verseNumber,
              textUthmani: verse.text_uthmani_tajweed.replace(/<tajweed/g, '<span')
                .replace(/<\/tajweed>/g, '</span>')
                .replace(/<span class=end>.*?<\/span>/g, ''),
              translation: translation
            };
          })
        };

        setSurahData(processedData);

        // Also fetch verse audio URLs
        fetchVerseUrls();
      } catch (error) {
        console.error("Error fetching surah data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurahData();

    setIndividualVersePlayback(null);
    // Clear verse URL cache when surah changes
    setVerseUrls({});
  }, [surahNumber, translationId, showTranslation]);

  // Fetch verse URLs for individual verse playback
  const fetchVerseUrls = async () => {
    try {
      // Create a map of verse numbers to URLs
      const baseUrl = 'https://verses.quran.com/';
      const urlMap = {};

      // Fetch all verses in a single request by setting per_page to a high number
      const timestampsResponse = await fetch(
        `https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${surahNumber}?per_page=300`
      );

      if (!timestampsResponse.ok) {
        throw new Error('Failed to fetch timestamp data');
      }

      const timestampsData = await timestampsResponse.json();
      const verses = timestampsData.audio_files;

      // Add all verses to the URL map
      verses.forEach(verse => {
        const verseKey = verse.verse_key;
        const verseNumber = parseInt(verseKey.split(':')[1]);
        urlMap[verseNumber] = `${baseUrl}${verse.url}`;
      });

      setVerseUrls(urlMap);
      console.log(`Loaded ${Object.keys(urlMap).length} verse URLs`);
    } catch (error) {
      console.error("Error fetching verse URLs:", error);
    }
  };

  // Re-fetch verse URLs when reciter changes
  useEffect(() => {
    if (surahData) {
      fetchVerseUrls();
    }
  }, [reciterId]);

  const handleReciterChange = (e) => {
    setReciterId(parseInt(e.target.value));
  };

  const handleTranslationChange = (e) => {
    setTranslationId(parseInt(e.target.value));
  };

  // Play a single verse directly
  const handleVerseClick = async (verseNumber) => {
    // Stop current playback
    verseAudioRef.current.pause();

    // Stop full surah playback if it's playing
    if (!audioRef.current.paused) {
      audioRef.current.pause();
    }

    // If same verse is clicked again and was playing, just stop it
    if (individualVersePlayback === verseNumber) {
      setIndividualVersePlayback(null);
      return;
    }

    try {
      // Check if we already have the URL
      let verseUrl = verseUrls[verseNumber];

      // If URL isn't cached, fetch it (this is a fallback)
      if (!verseUrl) {
        await fetchVerseUrls();
        verseUrl = verseUrls[verseNumber];

        if (!verseUrl) {
          throw new Error("Verse URL not found");
        }
      }

      // Set source and play
      verseAudioRef.current.src = verseUrl;
      verseAudioRef.current.load();

      await verseAudioRef.current.play();

      // Update state to highlight the verse
      setIndividualVersePlayback(verseNumber);
    } catch (error) {
      console.error("Error playing verse:", error);
    }
  };

  // Pass this function to the QuranAudioPlayer component to allow it to pause individual verse playback
  const pauseIndividualVerse = () => {
    if (individualVersePlayback !== null) {
      verseAudioRef.current.pause();
      setIndividualVersePlayback(null);
    }
  };

  if (loading && !surahData) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="bg-[#fdfaf2] border-[16px] border-double border-green-900 p-4 shadow-xl max-w-2xl mx-auto my-10 rounded-xl">
      {/* Navigation */}
      <div className="flex justify-between mb-4 text-green-800 font-semibold">
        <button
          onClick={() => setSurahNumber((prev) => Math.max(prev - 1, 1))}
          disabled={surahNumber === 1}
          className="px-3 py-1 rounded bg-green-100 hover:bg-green-200 disabled:opacity-50 cursor-pointer"
        >
          ⬅ Previous
        </button>

        <span className="text-xl">Surah {surahNumber}</span>

        <button
          onClick={() => setSurahNumber((prev) => Math.min(prev + 1, TOTAL_SURAHS))}
          disabled={surahNumber === TOTAL_SURAHS}
          className="px-3 py-1 rounded bg-green-100 hover:bg-green-200 disabled:opacity-50 cursor-pointer"
        >
          Next ➡
        </button>
      </div>

      {/* Settings */}
      <style type="text/css">
        {generateTajweedStyles()}
      </style>

      {/* Tajweed Settings */}
      <TajweedSettings
        tajweedRules={tajweedRules}
        onToggleRule={handleToggleTajweedRule}
        onToggleAll={handleToggleAllTajweedRules}
      />

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Reciter selection */}
        <div>
          <label htmlFor="reciter" className="block text-sm font-medium text-green-700">
            Reciter
          </label>
          <select
            id="reciter"
            value={reciterId}
            onChange={handleReciterChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-green-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
          >
            {reciters.map(reciter => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.reciter_name}
              </option>
            ))}
          </select>
        </div>

        {/* Translation selection */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="translation" className="block text-sm font-medium text-green-700">
              Translation
            </label>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={() => setShowTranslation(!showTranslation)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              <span className="ms-2 text-xs font-medium text-gray-700">Show</span>
            </label>
          </div>
          <select
            id="translation"
            value={translationId}
            onChange={handleTranslationChange}
            disabled={!showTranslation}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-green-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md disabled:opacity-50"
          >
            {translations.map(translation => (
              <option key={translation.id} value={translation.id}>
                {translation.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="text-center text-2xl text-green-900 font-serif border-b-2 border-green-800 pb-2 mb-4 relative" dir="rtl">
        <div className="absolute left-4 top-0">🕊</div>
        {surahData && (
          <>
            سورة {surahData.name}
            <div className="text-base text-green-700 font-normal" dir="ltr">
              {surahData.englishName}
            </div>
          </>
        )}
        <div className="absolute right-4 top-0">🕊</div>
      </div>

      <div
        className="overflow-auto max-h-[300px]"
        style={{
          scrollbarColor: '#a8d1a8 #fdfaf2',
          scrollbarWidth: 'thin'
        }}
      >
        {/* Quran verses */}
        {surahData && (
          <div className="space-y-6">
            {/* Bismillah for all surahs except Surah 9 */}
            {surahNumber !== 9 && surahNumber !== 1 && (
              <div className="text-green-800 text-center font-quran text-2xl mb-4">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
            )}

            {/* Verses */}
            {surahData.verses.map((verse) => {
              // Check if this verse is playing through individual playback
              const isPlaying = verse.verseNumber === individualVersePlayback;

              return (
                <div key={verse.id} className="verse-container">
                  {/* Arabic text */}
                  <div
                    className="font-quran text-2xl leading-loose text-justify mb-2"
                    dir="rtl"
                  >
                    <span
                      className={`cursor-pointer transition-colors duration-300 ${isPlaying ? "bg-green-300 px-1 rounded" : "hover:bg-green-200"}`}
                      onClick={() => handleVerseClick(verse.verseNumber)}
                      dangerouslySetInnerHTML={{ __html: verse.textUthmani }}
                    >
                    </span>
                    <VerseNumber verseNumber={verse.verseNumber} />
                  </div>

                  {/* Translation */}
                  {showTranslation && verse.translation && (
                    <div className="text-gray-700 text-base pl-4 border-l-2 border-green-200" dangerouslySetInnerHTML={{ __html: verse.translation }}>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {surahData && (
        <QuranAudioPlayer
          surahNumber={surahNumber}
          reciterId={reciterId}
          audioRef={audioRef}
          onPlay={pauseIndividualVerse}
        />
      )}
    </div>
  );
};

export default QuranPage;