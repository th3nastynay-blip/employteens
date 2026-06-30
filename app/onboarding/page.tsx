'use client'

import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { Step00Welcome } from '@/components/onboarding/steps/Step00Welcome'
import { Step01Name } from '@/components/onboarding/steps/Step01Name'
import { Step02Age } from '@/components/onboarding/steps/Step02Age'
import { Step03Location } from '@/components/onboarding/steps/Step03Location'
import { Step04Transport } from '@/components/onboarding/steps/Step04Transport'
import { Step05School } from '@/components/onboarding/steps/Step05School'
import { Step06Availability } from '@/components/onboarding/steps/Step06Availability'
import { Step07Interests } from '@/components/onboarding/steps/Step07Interests'
import { Step08Skills } from '@/components/onboarding/steps/Step08Skills'
import { Step09Experience } from '@/components/onboarding/steps/Step09Experience'
import { Step10Resume } from '@/components/onboarding/steps/Step10Resume'
import { Step11Processing } from '@/components/onboarding/steps/Step11Processing'
import { Step12Done } from '@/components/onboarding/steps/Step12Done'

const STEPS = [
  Step00Welcome,
  Step01Name,
  Step02Age,
  Step03Location,
  Step04Transport,
  Step05School,
  Step06Availability,
  Step07Interests,
  Step08Skills,
  Step09Experience,
  Step10Resume,
  Step11Processing,
  Step12Done,
]

export default function OnboardingPage() {
  const step = useOnboardingStore((s) => s.step)
  const StepComponent = STEPS[Math.min(step, STEPS.length - 1)]

  return (
    <OnboardingShell>
      <StepComponent />
    </OnboardingShell>
  )
}
