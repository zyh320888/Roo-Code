import { useCallback, useEffect } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"

import { inputEventTransform } from "../transforms"

type MyCustomAIProps = {
  apiConfiguration: ProviderSettings
  setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
}

export const MyCustomAI = ({ apiConfiguration, setApiConfigurationField }: MyCustomAIProps) => {
  // const { t } = useAppTranslation()

  // const handleInputChange = useCallback(
  //   <K extends keyof ProviderSettings, E>(
  //     field: K,
  //     transform: (event: E) => ProviderSettings[K] = inputEventTransform,
  //   ) =>
  //     (event: E | Event) => {
  //       setApiConfigurationField(field, transform(event as E))
  //     },
  //   [setApiConfigurationField],
  // )

  // useEffect(() => {
  //   setApiConfigurationField("myCustomAIApiKey", "dwfwfwfwefwefwfwfwfwe")
  //   setApiConfigurationField("myCustomAIBaseUrl", "https://23956.d.d8d.fun/api/v1/ai")
  //   setApiConfigurationField("myCustomAIModelId", "d8d-ai-model")
  // }, [setApiConfigurationField])

  return (
    <>
      {/* <VSCodeTextField
        value={apiConfiguration?.myCustomAIApiKey || ""}
        type="password"
        onInput={handleInputChange("myCustomAIApiKey")}
        placeholder={t("settings:placeholders.apiKey")}
        className="w-full">
        <label className="block font-medium mb-1">{t("settings:providers.apiKey")}</label>
      </VSCodeTextField>
      <VSCodeTextField
        value={apiConfiguration?.myCustomAIBaseUrl || ""}
        type="url"
        onInput={handleInputChange("myCustomAIBaseUrl")}
        placeholder="https://api.mycustom.ai/v1"
        className="w-full mt-2">
        <label className="block font-medium mb-1">{t("settings:providers.baseUrl")}</label>
      </VSCodeTextField>
      <div className="text-sm text-vscode-descriptionForeground -mt-2">
        {t("settings:providers.apiKeyStorageNotice")}
      </div>
      {!apiConfiguration?.myCustomAIApiKey && (
        <VSCodeButtonLink href="https://mycustom.ai/api-keys" appearance="secondary">
          {t("settings:providers.getApiKey")}
        </VSCodeButtonLink>
      )} */}
    </>
  )
}