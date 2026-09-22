interface SiteConfig {
  firstName: string;
  lastName: string;
  contactEmail: string;
  /** Doplnit až při zahájení monetizace (CPC/affiliate). Do té doby web nevydělává,
   *  takže IČO ve footeru ani v zásadách ochrany osobních údajů nemusí být uvedené. */
  ico?: string;
}

export const siteConfig: SiteConfig = {
  firstName: 'Adam',
  lastName: 'Kment',
  contactEmail: 'adas.kment@gmail.com',
};

export const CONSENT_TEXT =
  'Odesláním souhlasíte se zpracováním e-mailu za účelem informování o spuštění webu. Souhlas můžete kdykoli odvolat.';
