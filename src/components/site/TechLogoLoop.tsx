import { site } from '@/data/site';

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';

type TechItem = {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  mono?: boolean;
};

function iconSrc({ slug, icon, color }: TechItem) {
  if (icon) return icon;
  return color ? `${SIMPLE_ICONS_CDN}/${slug}/${color}` : `${SIMPLE_ICONS_CDN}/${slug}`;
}

function TechLogoItem(item: TechItem) {
  const { name, mono } = item;
  const src = iconSrc(item);
  const iconClass = ['tech-loop__icon', mono && 'tech-loop__icon--mono'].filter(Boolean).join(' ');

  return (
    <span className="tech-loop__item" title={name}>
      <img
        className={iconClass}
        src={src}
        alt=""
        width={20}
        height={20}
        loading="lazy"
        decoding="async"
      />
      <span className="tech-loop__label">{name}</span>
    </span>
  );
}

export function TechLogoLoop() {
  const items = site.techStack;

  return (
    <div className="tech-loop" aria-label="Technologies I work with">
      <div className="tech-loop__fade tech-loop__fade--left" aria-hidden="true" />
      <div className="tech-loop__fade tech-loop__fade--right" aria-hidden="true" />
      <div className="tech-loop__viewport">
        <div className="tech-loop__track">
          <div className="tech-loop__group">
            {items.map((item) => (
              <TechLogoItem key={item.name} {...item} />
            ))}
          </div>
          <div className="tech-loop__group" aria-hidden="true">
            {items.map((item) => (
              <TechLogoItem key={`${item.name}-dup`} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
