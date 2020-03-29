// @flow
import type { Settings } from '../../models/settings';
import type { Response } from '../../models/response';
import type { OAuth2Token } from '../../models/o-auth-2-token';
import type { Workspace } from '../../models/workspace';
import type {
  Request,
  RequestAuthentication,
  RequestBody,
  RequestHeader,
  RequestParameter,
} from '../../models/request';
import type { SidebarChildObjects } from './sidebar/sidebar-children';
import SidebarChildren from './sidebar/sidebar-children';

import * as React from 'react';
import autobind from 'autobind-decorator';
import classnames from 'classnames';
import { registerModal, showModal } from './modals/index';
import AlertModal from './modals/alert-modal';
import WrapperModal from './modals/wrapper-modal';
import ErrorModal from './modals/error-modal';
import CookieModifyModal from '../components/modals/cookie-modify-modal';
import GenerateCodeModal from './modals/generate-code-modal';
import LoginModal from './modals/login-modal';
import ResponseDebugModal from './modals/response-debug-modal';
import PaymentNotificationModal from './modals/payment-notification-modal';
import NunjucksModal from './modals/nunjucks-modal';
import PromptModal from './modals/prompt-modal';
import AskModal from './modals/ask-modal';
import SelectModal from './modals/select-modal';
import RequestCreateModal from './modals/request-create-modal';
import RequestPane from './request-pane';
import RequestSwitcherModal from './modals/request-switcher-modal';
import SettingsModal from './modals/settings-modal';
import FilterHelpModal from './modals/filter-help-modal';
import ResponsePane from './response-pane';
import RequestSettingsModal from './modals/request-settings-modal';
import SetupSyncModal from './modals/setup-sync-modal';
import SyncStagingModal from './modals/sync-staging-modal';
import SyncMergeModal from './modals/sync-merge-modal';
import SyncHistoryModal from './modals/sync-history-modal';
import SyncShareModal from './modals/sync-share-modal';
import SyncBranchesModal from './modals/sync-branches-modal';
import RequestRenderErrorModal from './modals/request-render-error-modal';
import Sidebar from './sidebar/sidebar';
import WorkspaceSettingsModal from './modals/workspace-settings-modal';
import WorkspaceShareSettingsModal from './modals/workspace-share-settings-modal';
import CodePromptModal from './modals/code-prompt-modal';
import * as db from '../../common/database';
import * as models from '../../models/index';
import * as importers from 'oberon-importers';
import type { CookieJar } from '../../models/cookie-jar';
import ErrorBoundary from './error-boundary';
import type { ClientCertificate } from '../../models/client-certificate';
import MoveRequestGroupModal from './modals/move-request-group-modal';
import AddKeyCombinationModal from './modals/add-key-combination-modal';
import ExportRequestsModal from './modals/export-requests-modal';
import VCS from '../../sync/vcs';
import type { StatusCandidate } from '../../sync/types';
import type { RequestMeta } from '../../models/request-meta';
import type { RequestVersion } from '../../models/request-version';
import SidebarFilter from './sidebar/sidebar-filter';

type Props = {
  // Helper Functions
  handleActivateRequest: Function,
  handleSetSidebarFilter: Function,
  handleToggleMenuBar: Function,
  handleImportFileToWorkspace: Function,
  handleImportClipBoardToWorkspace: Function,
  handleImportUriToWorkspace: Function,
  handleExportFile: Function,
  handleShowExportRequestsModal: Function,
  handleExportRequestsToFile: Function,
  handleSetActiveWorkspace: Function,
  handleMoveDoc: Function,
  handleCreateRequest: Function,
  handleDuplicateRequest: Function,
  handleDuplicateRequestGroup: Function,
  handleMoveRequestGroup: Function,
  handleDuplicateWorkspace: Function,
  handleCreateRequestGroup: Function,
  handleGenerateCodeForActiveRequest: Function,
  handleGenerateCode: Function,
  handleCopyAsCurl: Function,
  handleCreateRequestForWorkspace: Function,
  handleSetRequestPaneRef: Function,
  handleSetResponsePaneRef: Function,
  handleSetResponsePreviewMode: Function,
  handleRender: Function,
  handleGetRenderContext: Function,
  handleSetResponseFilter: Function,
  handleSetActiveResponse: Function,
  handleSetSidebarRef: Function,
  handleStartDragSidebar: Function,
  handleResetDragSidebar: Function,
  handleStartDragPaneHorizontal: Function,
  handleStartDragPaneVertical: Function,
  handleResetDragPaneHorizontal: Function,
  handleResetDragPaneVertical: Function,
  handleSetRequestGroupCollapsed: Function,
  handleSetRequestPinned: Function,
  handleUpdateRequestMimeType: Function,
  handleUpdateDownloadPath: Function,

  // Properties
  loadStartTime: number,
  isLoading: boolean,
  paneWidth: number,
  paneHeight: number,
  responsePreviewMode: string,
  responseFilter: string,
  responseFilterHistory: Array<string>,
  responseDownloadPath: string | null,
  sidebarWidth: number,
  sidebarHidden: boolean,
  sidebarFilter: string,
  sidebarChildren: SidebarChildObjects,
  settings: Settings,
  workspaces: Array<Workspace>,
  requestMetas: Array<RequestMeta>,
  requests: Array<Request>,
  requestVersions: Array<RequestVersion>,
  unseenWorkspaces: Array<Workspace>,
  workspaceChildren: Array<Object>,
  activeRequestResponses: Array<Response>,
  activeWorkspace: Workspace,
  activeCookieJar: CookieJar,
  activeWorkspaceClientCertificates: Array<ClientCertificate>,
  isVariableUncovered: boolean,
  headerEditorKey: string,
  vcs: VCS | null,
  syncItems: Array<StatusCandidate>,

  // Optional
  oAuth2Token: OAuth2Token | null,
  activeRequest: Request | null,
  activeResponse: Response | null,
};

type State = {
  forceRefreshKey: number,
};

const rUpdate = (request, ...args) => {
  if (!request) {
    throw new Error('Tried to update null request');
  }

  return models.request.update(request, ...args);
};

const sUpdate = models.settings.update;

@autobind
class Wrapper extends React.PureComponent<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      forceRefreshKey: Date.now(),
    };
  }

  // Request updaters
  async _handleForceUpdateRequest(r: Request, patch: Object): Promise<Request> {
    const newRequest = await rUpdate(r, patch);

    // Give it a second for the app to render first. If we don't wait, it will refresh
    // on the old request and won't catch the newest one.
    // TODO: Move this refresh key into redux store so we don't need timeout
    window.setTimeout(this._forceRequestPaneRefresh, 100);

    return newRequest;
  }

  _handleForceUpdateRequestHeaders(r: Request, headers: Array<RequestHeader>): Promise<Request> {
    return this._handleForceUpdateRequest(r, { headers });
  }

  static _handleUpdateRequestBody(r: Request, body: RequestBody): Promise<Request> {
    return rUpdate(r, { body });
  }

  static _handleUpdateRequestParameters(
    r: Request,
    parameters: Array<RequestParameter>,
  ): Promise<Request> {
    return rUpdate(r, { parameters });
  }

  static _handleUpdateRequestAuthentication(
    r: Request,
    authentication: RequestAuthentication,
  ): Promise<Request> {
    return rUpdate(r, { authentication });
  }

  static _handleUpdateRequestHeaders(r: Request, headers: Array<RequestHeader>): Promise<Request> {
    return rUpdate(r, { headers });
  }

  static _handleUpdateRequestMethod(r: Request, method: string): Promise<Request> {
    return rUpdate(r, { method });
  }

  static _handleUpdateRequestUrl(r: Request, url: string): Promise<Request> {
    // Don't update if we don't need to
    if (r.url === url) {
      return Promise.resolve(r);
    }

    return rUpdate(r, { url });
  }

  // Special request updaters
  _handleStartDragSidebar(e: Event): void {
    e.preventDefault();
    this.props.handleStartDragSidebar();
  }

  async _handleImport(text: string): Promise<Request | null> {
    // Allow user to paste any import file into the url. If it results in
    // only one item, it will overwrite the current request.
    try {
      const { data } = await importers.convert(text);
      const { resources } = data;
      const r = resources[0];

      if (r && r._type === 'request' && this.props.activeRequest) {
        // Only pull fields that we want to update
        return this._handleForceUpdateRequest(this.props.activeRequest, {
          url: r.url,
          method: r.method,
          headers: r.headers,
          body: r.body,
          authentication: r.authentication,
          parameters: r.parameters,
        });
      }
    } catch (e) {
      // Import failed, that's alright
    }

    return null;
  }

  // Settings updaters
  _handleUpdateSettingsShowPasswords(showPasswords: boolean): Promise<Settings> {
    return sUpdate(this.props.settings, { showPasswords });
  }

  _handleUpdateSettingsUseBulkHeaderEditor(useBulkHeaderEditor: boolean): Promise<Settings> {
    return sUpdate(this.props.settings, { useBulkHeaderEditor });
  }

  _handleUpdateSettingsUseBulkParametersEditor(
    useBulkParametersEditor: boolean,
  ): Promise<Settings> {
    return sUpdate(this.props.settings, { useBulkParametersEditor });
  }

  // Other Helpers
  _handleImportFile(): void {
    this.props.handleImportFileToWorkspace(this.props.activeWorkspace._id);
  }

  _handleImportClipBoard(): void {
    this.props.handleImportClipBoardToWorkspace(this.props.activeWorkspace._id);
  }

  _handleImportUri(uri: string): void {
    this.props.handleImportUriToWorkspace(this.props.activeWorkspace._id, uri);
  }

  _handleSetActiveResponse(responseId: string | null): void {
    if (!this.props.activeRequest) {
      console.warn('Tried to set active response when request not active');
      return;
    }

    this.props.handleSetActiveResponse(this.props.activeRequest._id, responseId);
  }

  static _handleShowModifyCookieModal(cookie: Object): void {
    showModal(CookieModifyModal, cookie);
  }

  _handleShowRequestSettingsModal(): void {
    showModal(RequestSettingsModal, { request: this.props.activeRequest });
  }

  async _handleDeleteResponses(requestId: string, environmentId: string | null): Promise<void> {
    const { handleSetActiveResponse, activeRequest } = this.props;

    await models.response.removeForRequest(requestId, environmentId);

    if (activeRequest && activeRequest._id === requestId) {
      await handleSetActiveResponse(requestId, null);
    }
  }

  async _handleDeleteResponse(response: Response): Promise<void> {
    if (response) {
      await models.response.remove(response);
    }

    // Also unset active response it's the one we're deleting
    if (this.props.activeResponse && this.props.activeResponse._id === response._id) {
      this._handleSetActiveResponse(null);
    }
  }

  async _handleRemoveActiveWorkspace(): Promise<void> {
    const { workspaces, activeWorkspace } = this.props;
    if (workspaces.length <= 1) {
      showModal(AlertModal, {
        title: 'Deleting Last Workspace',
        message: 'Since you deleted your only workspace, a new one has been created for you.',
      });

      models.workspace.create({ name: 'oberon' });
    }

    await models.workspace.remove(activeWorkspace);
  }

  async _handleActiveWorkspaceClearAllResponses(): Promise<void> {
    const docs = await db.withDescendants(this.props.activeWorkspace, models.request.type);
    const requests = docs.filter(doc => doc.type === models.request.type);
    for (const req of requests) {
      await models.response.removeForRequest(req._id);
    }
  }

  _handleSetPreviewMode(previewMode: string): void {
    const activeRequest = this.props.activeRequest;
    const activeRequestId = activeRequest ? activeRequest._id : 'n/a';
    this.props.handleSetResponsePreviewMode(activeRequestId, previewMode);
  }

  _handleSetResponseFilter(filter: string): void {
    const activeRequest = this.props.activeRequest;
    const activeRequestId = activeRequest ? activeRequest._id : 'n/a';
    this.props.handleSetResponseFilter(activeRequestId, filter);
  }

  _handleCreateRequestInWorkspace() {
    const { activeWorkspace, handleCreateRequest } = this.props;
    handleCreateRequest(activeWorkspace._id);
  }

  _handleCreateRequestGroupInWorkspace() {
    const { activeWorkspace, handleCreateRequestGroup } = this.props;
    handleCreateRequestGroup(activeWorkspace._id);
  }

  _forceRequestPaneRefresh(): void {
    this.setState({ forceRefreshKey: Date.now() });
  }

  renderSidebarBody(): React.Node {
    const {
      activeRequest,
      activeWorkspace,
      handleActivateRequest,
      handleCopyAsCurl,
      handleCreateRequest,
      handleCreateRequestGroup,
      handleDuplicateRequest,
      handleDuplicateRequestGroup,
      handleGenerateCode,
      handleMoveDoc,
      handleMoveRequestGroup,
      handleSetRequestGroupCollapsed,
      handleSetRequestPinned,
      handleSetSidebarFilter,
      settings,
      sidebarChildren,
      sidebarFilter,
      sidebarWidth,
      sidebarHidden,
    } = this.props;

    return (
      <React.Fragment>
        <SidebarFilter
          key={`${activeWorkspace._id}::filter`}
          onChange={handleSetSidebarFilter}
          requestCreate={this._handleCreateRequestInWorkspace}
          requestGroupCreate={this._handleCreateRequestGroupInWorkspace}
          filter={sidebarFilter || ''}
          hotKeyRegistry={settings.hotKeyRegistry}
        />

        <SidebarChildren
          childObjects={sidebarChildren}
          handleActivateRequest={handleActivateRequest}
          handleCreateRequest={handleCreateRequest}
          handleCreateRequestGroup={handleCreateRequestGroup}
          handleSetRequestGroupCollapsed={handleSetRequestGroupCollapsed}
          handleSetRequestPinned={handleSetRequestPinned}
          handleDuplicateRequest={handleDuplicateRequest}
          handleDuplicateRequestGroup={handleDuplicateRequestGroup}
          handleMoveRequestGroup={handleMoveRequestGroup}
          handleGenerateCode={handleGenerateCode}
          handleCopyAsCurl={handleCopyAsCurl}
          moveDoc={handleMoveDoc}
          hidden={sidebarHidden}
          width={sidebarWidth}
          workspace={activeWorkspace}
          activeRequest={activeRequest}
          filter={sidebarFilter || ''}
          hotKeyRegistry={settings.hotKeyRegistry}
        />
      </React.Fragment>
    );
  }

  render() {
    const {
      activeRequest,
      activeRequestResponses,
      activeResponse,
      activeWorkspace,
      activeWorkspaceClientCertificates,
      handleActivateRequest,
      handleCreateRequestForWorkspace,
      handleDuplicateWorkspace,
      handleExportFile,
      handleExportRequestsToFile,
      handleGenerateCodeForActiveRequest,
      handleGetRenderContext,
      handleRender,
      handleResetDragPaneHorizontal,
      handleResetDragPaneVertical,
      handleResetDragSidebar,
      handleSetActiveWorkspace,
      handleSetRequestPaneRef,
      handleSetResponsePaneRef,
      handleSetSidebarRef,
      handleShowExportRequestsModal,
      handleStartDragPaneHorizontal,
      handleStartDragPaneVertical,
      handleToggleMenuBar,
      handleUpdateDownloadPath,
      handleUpdateRequestMimeType,
      headerEditorKey,
      isLoading,
      isVariableUncovered,
      loadStartTime,
      oAuth2Token,
      paneHeight,
      paneWidth,
      requestMetas,
      requestVersions,
      responseDownloadPath,
      responseFilter,
      responseFilterHistory,
      responsePreviewMode,
      settings,
      sidebarChildren,
      sidebarHidden,
      sidebarWidth,
      syncItems,
      unseenWorkspaces,
      vcs,
      workspaceChildren,
      workspaces,
    } = this.props;

    const realSidebarWidth = sidebarHidden ? 0 : sidebarWidth;

    const columns = `${realSidebarWidth}rem 0 minmax(0, ${paneWidth}fr) 0 minmax(0, ${1 -
      paneWidth}fr)`;
    const rows = `minmax(0, ${paneHeight}fr) 0 minmax(0, ${1 - paneHeight}fr)`;

    return [
      <div key="modals" className="modals">
        <ErrorBoundary showAlert>
          <AlertModal ref={registerModal} />
          <ErrorModal ref={registerModal} />
          <PromptModal ref={registerModal} />

          <WrapperModal ref={registerModal} />
          <LoginModal ref={registerModal} />
          <AskModal ref={registerModal} />
          <SelectModal ref={registerModal} />
          <RequestCreateModal ref={registerModal} />
          <PaymentNotificationModal ref={registerModal} />
          <FilterHelpModal ref={registerModal} />
          <RequestRenderErrorModal ref={registerModal} />

          <CodePromptModal
            ref={registerModal}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
            editorFontSize={settings.editorFontSize}
            editorIndentSize={settings.editorIndentSize}
            editorKeyMap={settings.editorKeyMap}
            editorLineWrapping={settings.editorLineWrapping}
            isVariableUncovered={isVariableUncovered}
          />

          <RequestSettingsModal
            ref={registerModal}
            editorFontSize={settings.editorFontSize}
            editorIndentSize={settings.editorIndentSize}
            editorKeyMap={settings.editorKeyMap}
            editorLineWrapping={settings.editorLineWrapping}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
            workspaces={workspaces}
            isVariableUncovered={isVariableUncovered}
          />

          <NunjucksModal
            uniqueKey={`key::${this.state.forceRefreshKey}`}
            ref={registerModal}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            workspace={activeWorkspace}
          />

          <MoveRequestGroupModal ref={registerModal} workspaces={workspaces} />

          <WorkspaceSettingsModal
            ref={registerModal}
            clientCertificates={activeWorkspaceClientCertificates}
            workspace={activeWorkspace}
            editorFontSize={settings.editorFontSize}
            editorIndentSize={settings.editorIndentSize}
            editorKeyMap={settings.editorKeyMap}
            editorLineWrapping={settings.editorLineWrapping}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
            handleRemoveWorkspace={this._handleRemoveActiveWorkspace}
            handleDuplicateWorkspace={handleDuplicateWorkspace}
            handleClearAllResponses={this._handleActiveWorkspaceClearAllResponses}
            isVariableUncovered={isVariableUncovered}
          />

          <WorkspaceShareSettingsModal ref={registerModal} workspace={activeWorkspace} />

          <GenerateCodeModal
            ref={registerModal}
            editorFontSize={settings.editorFontSize}
            editorIndentSize={settings.editorIndentSize}
            editorKeyMap={settings.editorKeyMap}
          />

          <SettingsModal
            ref={registerModal}
            handleShowExportRequestsModal={handleShowExportRequestsModal}
            handleExportAllToFile={handleExportFile}
            handleImportFile={this._handleImportFile}
            handleImportClipBoard={this._handleImportClipBoard}
            handleImportUri={this._handleImportUri}
            handleToggleMenuBar={handleToggleMenuBar}
            settings={settings}
          />

          <ResponseDebugModal ref={registerModal} settings={settings} />

          <RequestSwitcherModal
            ref={registerModal}
            workspace={activeWorkspace}
            workspaces={workspaces}
            workspaceChildren={workspaceChildren}
            activeRequest={activeRequest}
            activateRequest={handleActivateRequest}
            requestMetas={requestMetas}
            handleSetActiveWorkspace={handleSetActiveWorkspace}
          />

          <SetupSyncModal ref={registerModal} workspace={activeWorkspace} />

          {vcs && (
            <React.Fragment>
              <SyncStagingModal
                ref={registerModal}
                workspace={activeWorkspace}
                vcs={vcs}
                syncItems={syncItems}
              />
              <SyncMergeModal
                ref={registerModal}
                workspace={activeWorkspace}
                syncItems={syncItems}
                vcs={vcs}
              />
              <SyncBranchesModal
                ref={registerModal}
                workspace={activeWorkspace}
                vcs={vcs}
                syncItems={syncItems}
              />
              <SyncHistoryModal ref={registerModal} workspace={activeWorkspace} vcs={vcs} />
              <SyncShareModal ref={registerModal} workspace={activeWorkspace} vcs={vcs} />
            </React.Fragment>
          )}
{/*
          <WorkspaceEnvironmentsEditModal
            ref={registerModal}
            onChange={models.workspace.update}
            lineWrapping={settings.editorLineWrapping}
            editorFontSize={settings.editorFontSize}
            editorIndentSize={settings.editorIndentSize}
            editorKeyMap={settings.editorKeyMap}
            activeEnvironmentId={activeEnvironment ? activeEnvironment._id : null}
            render={handleRender}
            getRenderContext={handleGetRenderContext}
            nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
            isVariableUncovered={isVariableUncovered}
          /> */}

          <AddKeyCombinationModal ref={registerModal} />
          <ExportRequestsModal
            ref={registerModal}
            childObjects={sidebarChildren.all}
            handleExportRequestsToFile={handleExportRequestsToFile}
          />
        </ErrorBoundary>
      </div>,
      <div
        key="wrapper"
        id="wrapper"
        className={classnames('wrapper', {
          'wrapper--vertical': settings.forceVerticalLayout,
        })}
        style={{
          gridTemplateColumns: columns,
          gridTemplateRows: rows,
          boxSizing: 'border-box',
          borderTop: null,
          borderBottom: null,
          borderLeft: null,
          borderRight: null,
        }}>
        <ErrorBoundary showAlert>
          <Sidebar
            ref={handleSetSidebarRef}
            enableSyncBeta={settings.enableSyncBeta}
            handleSetActiveWorkspace={handleSetActiveWorkspace}
            hidden={sidebarHidden || false}
            hotKeyRegistry={settings.hotKeyRegistry}
            isLoading={isLoading}
            syncItems={syncItems}
            unseenWorkspaces={unseenWorkspaces}
            vcs={vcs}
            width={sidebarWidth}
            workspace={activeWorkspace}
            workspaces={workspaces}>
            {this.renderSidebarBody()}
          </Sidebar>
        </ErrorBoundary>

        <div className="drag drag--sidebar">
          <div onDoubleClick={handleResetDragSidebar} onMouseDown={this._handleStartDragSidebar} />
        </div>

        <ErrorBoundary showAlert>
          <RequestPane
            ref={handleSetRequestPaneRef}
            downloadPath={responseDownloadPath}
            forceRefreshCounter={this.state.forceRefreshKey}
            forceUpdateRequest={this._handleForceUpdateRequest}
            forceUpdateRequestHeaders={this._handleForceUpdateRequestHeaders}
            handleCreateRequest={handleCreateRequestForWorkspace}
            handleGenerateCode={handleGenerateCodeForActiveRequest}
            handleGetRenderContext={handleGetRenderContext}
            handleImport={this._handleImport}
            handleImportFile={this._handleImportFile}
            handleRender={handleRender}
            handleUpdateDownloadPath={handleUpdateDownloadPath}
            headerEditorKey={headerEditorKey}
            isVariableUncovered={isVariableUncovered}
            nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
            oAuth2Token={oAuth2Token}
            request={activeRequest}
            settings={settings}
            updateRequestAuthentication={Wrapper._handleUpdateRequestAuthentication}
            updateRequestBody={Wrapper._handleUpdateRequestBody}
            updateRequestHeaders={Wrapper._handleUpdateRequestHeaders}
            updateRequestMethod={Wrapper._handleUpdateRequestMethod}
            updateRequestMimeType={handleUpdateRequestMimeType}
            updateRequestParameters={Wrapper._handleUpdateRequestParameters}
            updateRequestUrl={Wrapper._handleUpdateRequestUrl}
            updateSettingsShowPasswords={this._handleUpdateSettingsShowPasswords}
            updateSettingsUseBulkHeaderEditor={this._handleUpdateSettingsUseBulkHeaderEditor}
            updateSettingsUseBulkParametersEditor={
              this._handleUpdateSettingsUseBulkParametersEditor
            }
            workspace={activeWorkspace}
          />
        </ErrorBoundary>

        <div className="drag drag--pane-horizontal">
          <div
            onMouseDown={handleStartDragPaneHorizontal}
            onDoubleClick={handleResetDragPaneHorizontal}
          />
        </div>

        <div className="drag drag--pane-vertical">
          <div
            onMouseDown={handleStartDragPaneVertical}
            onDoubleClick={handleResetDragPaneVertical}
          />
        </div>

        <ErrorBoundary showAlert>
          <ResponsePane
            ref={handleSetResponsePaneRef}
            disableHtmlPreviewJs={settings.disableHtmlPreviewJs}
            disableResponsePreviewLinks={settings.disableResponsePreviewLinks}
            editorFontSize={settings.editorFontSize}
            editorIndentSize={settings.editorIndentSize}
            editorKeyMap={settings.editorKeyMap}
            editorLineWrapping={settings.editorLineWrapping}
            filter={responseFilter}
            filterHistory={responseFilterHistory}
            handleDeleteResponse={this._handleDeleteResponse}
            handleDeleteResponses={this._handleDeleteResponses}
            handleSetActiveResponse={this._handleSetActiveResponse}
            handleSetFilter={this._handleSetResponseFilter}
            handleSetPreviewMode={this._handleSetPreviewMode}
            handleShowRequestSettings={this._handleShowRequestSettingsModal}
            hotKeyRegistry={settings.hotKeyRegistry}
            loadStartTime={loadStartTime}
            previewMode={responsePreviewMode}
            request={activeRequest}
            requestVersions={requestVersions}
            response={activeResponse}
            responses={activeRequestResponses}
          />
        </ErrorBoundary>
      </div>,
    ];
  }
}

export default Wrapper;
