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
        <LegalList
          items={[
            'Donated books are gifts. Once a donation is handed over, it cannot be returned or refunded.',
            'You confirm that you own the books you donate and have the right to give them away.',
            'Books should be in usable condition and suitable for the school you choose.',
            'If monetary donations are enabled in the future, any refund terms for those will be stated at the point of payment.',
          ]}
        />
      </LegalSection>

      <LegalSection heading={t('terms.acceptableUseHeading')}>
        <LegalParagraph>{t('terms.acceptableUseBody')}</LegalParagraph>
        <LegalList
          items={[
            'Do not use BookBridge for any unlawful purpose.',
            'Do not submit false, misleading, or harmful information.',
            'Do not attempt to access accounts, data, or systems that are not yours.',
            'Do not disrupt, overload, or attempt to break the service.',
            'Do not upload content you do not have the right to share.',
          ]}
        />
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
