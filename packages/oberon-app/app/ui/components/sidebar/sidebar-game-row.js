import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import ReactDOM from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import classnames from 'classnames';
import GameActionsDropdown from '../dropdowns/game-actions-dropdown';
import Editable from '../base/editable';
import Highlight from '../base/highlight';
import MethodTag from '../tags/method-tag';
import * as models from '../../../models';
import { showModal } from '../modals/index';
import GameSettingsModal from '../modals/game-settings-modal';
import { CONTENT_TYPE_GRAPHQL } from '../../../common/constants';

@autobind
class SidebarGameRow extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      dragDirection: 0,
      isEditing: false,
    };
  }

  _setGameActionsDropdownRef(n) {
    this._gameActionsDropdown = n;
  }

  _handleShowGameActions(e) {
    e.preventDefault();
    this._gameActionsDropdown.show();
  }

  _handleEditStart() {
    this.setState({ isEditing: true });
  }

  _handleGameUpdateName(name) {
    models.game.update(this.props.game, { name });
    this.setState({ isEditing: false });
  }

  _handleGameCreateFromEmpty() {
    const parentId = this.props.gameGroup._id;
    this.props.gameCreate(parentId);
  }

  _handleGameActivate() {
    const { isActive, game, handleActivateGame } = this.props;

    if (isActive) {
      return;
    }

    handleActivateGame(game._id);
  }

  _handleShowGameSettings() {
    showModal(GameSettingsModal, { game: this.props.game });
  }

  setDragDirection(dragDirection) {
    if (dragDirection !== this.state.dragDirection) {
      this.setState({ dragDirection });
    }
  }

  render() {
    const {
      filter,
      handleDuplicateGame,
      handleSetGamePinned,
      handleGenerateCode,
      handleCopyAsCurl,
      connectDragSource,
      connectDropTarget,
      isDragging,
      isDraggingOver,
      game,
      gameGroup,
      isActive,
      isPinned,
      disableDragAndDrop,
      hotKeyRegistry,
    } = this.props;

    const { dragDirection } = this.state;

    let node;

    const classes = classnames('sidebar__row', {
      'sidebar__row--dragging': isDragging,
      'sidebar__row--dragging-above': isDraggingOver && dragDirection > 0,
      'sidebar__row--dragging-below': isDraggingOver && dragDirection < 0,
    });

    if (!game) {
      node = (
        <li className={classes}>
          <div className="sidebar__item">
            <button className="sidebar__clickable" onClick={this._handleGameCreateFromEmpty}>
              <em className="faded">click to add first game...</em>
            </button>
          </div>
        </li>
      );
    } else {
      node = (
        <li className={classes}>
          <div
            className={classnames('sidebar__item', 'sidebar__item--game', {
              'sidebar__item--active': isActive,
            })}>
            <button
              className="wide"
              onClick={this._handleGameActivate}
              onContextMenu={this._handleShowGameActions}>
              <div className="sidebar__clickable">
                <Editable
                  value={game.name}
                  className="inline-block"
                  onEditStart={this._handleEditStart}
                  onSubmit={this._handleGameUpdateName}
                  renderReadView={(value, props) => (
                    <Highlight
                      search={filter}
                      text={value}
                      {...props}
                      title={`${game.name}\n${props.title}`}
                    />
                  )}
                />
              </div>
            </button>
            <div className="sidebar__actions">
              <GameActionsDropdown
                right
                ref={this._setGameActionsDropdownRef}
                handleDuplicateGame={handleDuplicateGame}
                handleSetGamePinned={handleSetGamePinned}
                handleGenerateCode={handleGenerateCode}
                handleCopyAsCurl={handleCopyAsCurl}
                handleShowSettings={this._handleShowGameSettings}
                game={game}
                isPinned={isPinned}
                gameGroup={gameGroup}
                hotKeyRegistry={hotKeyRegistry}
              />
            </div>
            {isPinned && (
              <div className="sidebar__item__icon-pin">
                <i className="fa fa-thumb-tack" />
              </div>
            )}
          </div>
        </li>
      );
    }

    if (disableDragAndDrop) {
      return node;
    } else if (!this.state.isEditing) {
      return connectDragSource(connectDropTarget(node));
    } else {
      return connectDropTarget(node);
    }
  }
}

SidebarGameRow.propTypes = {
  // Functions
  handleActivateGame: PropTypes.func.isRequired,
  handleSetGamePinned: PropTypes.func.isRequired,
  handleDuplicateGame: PropTypes.func.isRequired,
  handleGenerateCode: PropTypes.func.isRequired,
  handleCopyAsCurl: PropTypes.func.isRequired,
  gameCreate: PropTypes.func.isRequired,
  moveDoc: PropTypes.func.isRequired,

  // Other
  filter: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  isPinned: PropTypes.bool.isRequired,
  hotKeyRegistry: PropTypes.object.isRequired,

  // React DnD
  isDragging: PropTypes.bool,
  isDraggingOver: PropTypes.bool,
  connectDragSource: PropTypes.func,
  connectDropTarget: PropTypes.func,

  // Optional
  gameGroup: PropTypes.object,
  game: PropTypes.object,
  disableDragAndDrop: PropTypes.bool,
};

const dragSource = {
  beginDrag(props) {
    return { game: props.game };
  },
};

function isAbove(monitor, component) {
  const hoveredNode = ReactDOM.findDOMNode(component);

  const hoveredTop = hoveredNode.getBoundingClientRect().top;
  const draggedTop = monitor.getSourceClientOffset().y;

  return hoveredTop > draggedTop;
}

const dragTarget = {
  drop(props, monitor, component) {
    const movingDoc = monitor.getItem().gameGroup || monitor.getItem().game;

    const parentId = props.gameGroup ? props.gameGroup._id : props.game.parentId;
    const targetId = props.game ? props.game._id : null;

    if (isAbove(monitor, component)) {
      props.moveDoc(movingDoc, parentId, targetId, 1);
    } else {
      props.moveDoc(movingDoc, parentId, targetId, -1);
    }
  },
  hover(props, monitor, component) {
    if (isAbove(monitor, component)) {
      component.setDragDirection(1);
    } else {
      component.setDragDirection(-1);
    }
  },
};

function sourceCollect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

function targetCollect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isDraggingOver: monitor.isOver(),
  };
}

const source = DragSource('SIDEBAR_GAME_ROW', dragSource, sourceCollect)(SidebarGameRow);
export default DropTarget('SIDEBAR_GAME_ROW', dragTarget, targetCollect)(source);
