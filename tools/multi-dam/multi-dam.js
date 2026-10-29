const REPOSITORY_ID = 'author-p9609-e26009.adobeaemcloud.com';
const SELECTOR_URL = 'https://experience.adobe.com/solutions/CQ-assets-selectors/static-assets/resources/assets-selectors.js';
const DA_ASSETS_URL = 'https://da.live/nx2/utils/aem-assets';
const DA_SDK_URL = 'https://da.live/nx/utils/sdk.js';

const repoConfig = {
  repositoryId: REPOSITORY_ID,
  tierType: 'author',
  assetOrigin: REPOSITORY_ID.replace(/^author-/, 'publish-'),
  assetBasePath: '/adobe/assets',
  isDmEnabled: false,
  approvedOnly: false,
  mimeRenditionOverrides: {},
  siteImageModifiers: null,
};

document.title = 'AEM Assets';
const status = document.querySelector('#status');
document.querySelector('#insert-asset')?.remove();
document.querySelector('#asset-preview')?.remove();

const selector = document.createElement('div');
selector.id = 'asset-selector';
selector.style.height = 'calc(100vh - 64px)';
selector.style.minHeight = '400px';
status.before(selector);

function loadSelector() {
  return new Promise((resolve, reject) => {
    if (window.PureJSSelectors?.renderAssetSelector) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SELECTOR_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Adobe Asset Selector. Reopen the extension to retry.'));
    document.head.append(script);
  });
}

async function init() {
  if (window.parent === window) {
    status.textContent = 'Open AEM Assets from the DA editor Extensions menu.';
    return;
  }

  try {
    const { default: sdk } = await import(DA_SDK_URL);
    const { actions, token } = await sdk;
    if (!token) throw new Error('No DA session token is available. Sign in to DA and reopen the extension.');

    status.textContent = 'Loading AEM Assets...';
    const [{ buildAssetSelectorProps }, { resolveAssetSelection }] = await Promise.all([
      import(`${DA_ASSETS_URL}/selector-props.js`),
      import(`${DA_ASSETS_URL}/selection.js`),
      loadSelector(),
    ]);

    const handleSelection = (assets) => {
      const [asset] = assets || [];
      if (!asset) return;

      try {
        const selection = resolveAssetSelection({ asset, repoConfig });
        if (selection.error) throw new Error(selection.error);
        const url = new URL(selection.href);
        const publishHost = repoConfig.assetOrigin;
        if (url.protocol !== 'https:' || url.hostname !== publishHost) {
          throw new Error('The selected asset must use this repository\'s HTTPS publish URL.');
        }

        const paragraph = document.createElement('p');
        const element = document.createElement(selection.isImage ? 'img' : 'a');
        if (selection.isImage) {
          element.src = url.href;
          element.alt = selection.alt || '';
        } else {
          element.href = url.href;
          element.textContent = asset['repo:name'] || asset.name || url.href;
        }
        paragraph.append(element);
        actions.sendHTML(paragraph.outerHTML);
        actions.closeLibrary();
      } catch (error) {
        status.textContent = error.message;
      }
    };

    const props = buildAssetSelectorProps({
      imsToken: token,
      repoConfig,
      onClose: () => actions.closeLibrary(),
      handleSelection,
    });
    props.hideRepositorySelector = true;
    window.PureJSSelectors.renderAssetSelector(selector, props);
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message;
  }
}

init();
