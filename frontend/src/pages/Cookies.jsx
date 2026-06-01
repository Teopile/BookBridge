import { useT } from '../i18n/I18nContext.jsx';
import LegalPage, { LegalSection, LegalParagraph, LegalList } from '../components/LegalPage.jsx';

const CONTACT_EMAIL = 'info@bookbridge.ge';

export default function Cookies() {
  const { t } = useT();

  return (
    <LegalPage titleKey="legal.cookiesTitle" introKey="cookies.intro">
      <LegalSection heading={t('cookies.whatHeading')}>
        <LegalParagraph>{t('cookies.whatBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('cookies.essentialHeading')}>
        <LegalParagraph>{t('cookies.essentialBody')}</LegalParagraph>
        <LegalList items={t('cookies.essentialItems')} />
      </LegalSection>

      <LegalSection heading={t('cookies.noTrackingHeading')}>
        <LegalParagraph>{t('cookies.noTrackingBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('cookies.controlHeading')}>
        <LegalParagraph>{t('cookies.controlBody')}</LegalParagraph>
        <LegalList items={t('cookies.controlItems')} />
      </LegalSection>

      <LegalSection heading={t('cookies.contactHeading')}>
        <LegalParagraph>
          {t('cookies.contactBody')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
