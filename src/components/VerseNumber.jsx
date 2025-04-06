import verseNumberSvg from '../assets/ayah-number.svg';

const VerseNumber = ({ verseNumber }) => {
  if (verseNumber <= 0) return null;

  const toArabicNumerals = (num) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(digit => arabicNumbers[parseInt(digit)]).join('');
  };

  return (
    <span className="relative inline-block top-1.5">
      <img
        src={verseNumberSvg}
        alt=""
        className={`w-[35px] h-[35px] mx-2 transition-transform duration-300`}
      />
      <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm`}>
        {toArabicNumerals(verseNumber)}
      </span>
    </span>
  );
};

export default VerseNumber;