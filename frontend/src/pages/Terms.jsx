import { useT } from '../i18n/I18nContext.jsx';
import LegalPage, { LegalSection, LegalParagraph, LegalList } from '../components/LegalPage.jsx';

const CONTACT_EMAIL = 'info@bookbridge.ge';

export default function Terms() {
  const { t } = useT();

  return (
    <LegalPage titleKey="legal.termsTitle" introKey="terms.intro">
      <LegalSection heading={t('terms.acceptanceHeading')}>
        <LegalParagraph>{t('terms.acceptanceBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('terms.eligibilityHeading')}>
        <LegalParagraph>{t('terms.eligibilityBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('terms.donationsHeading')}>
        <LegalParagraph>{t('terms.donationsBody')}</LegalParagraph>
        <LegalList items={t('terms.donationsItems')} />
      </LegalSection>

      <LegalSection heading={t('terms.acceptableUseHeading')}>
        <LegalParagraph>{t('terms.acceptableUseBody')}</LegalParagraph>
        <LegalList items={t('terms.acceptableUseItems')} />
      </LegalSection>

      <LegalSection heading={t('terms.accountsHeading')}>
        <LegalParagraph>{t('terms.accountsBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('terms.liabilityHeading')}>
        <LegalParagraph>{t('terms.liabilityBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('terms.governingLawHeading')}>
        <LegalParagraph>{t('terms.governingLawBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('terms.changesHeading')}>
        <LegalParagraph>{t('terms.changesBody')}</LegalParagraph>
      </LegalSection>

      <LegalSection heading={t('terms.contactHeading')}>
        <LegalParagraph>
          {t('terms.contactBody')}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
