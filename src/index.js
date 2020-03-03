import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { path } from 'ramda';
import { FaTimes } from './assets/icons';

const EDITOR_WIDTH = 150;
const EDITOR_HEIGHT = 32;

const theme = {
  white: '#ffffff',
  darkGrey: '#696969',
};

export const TagsWrapperStyled = styled.div`
  left: 0;
  top: 0;
  position: absolute;
  width: 100%;
  height: 100%;
  background: rbga(128, 128, 128, 0.3);
`;

export const TagStyled = styled.div`
  background-color: rgba(0,0,0,0.7);
  border-radius: 3px;
  color: ${({ transient }) => (transient ? theme.darkGrey : theme.white)};
  padding: 5px 10px;
  position: absolute;
`;

export const RemoveIconStyled = styled(FaTimes)`
  color: ${({ tagInProgress }) => (tagInProgress ? theme.darkGrey : theme.white)};
  cursor: pointer;
  margin-left: 10px;
`;

export const InputWrapperStyled = styled.div`
  position: absolute;
`;

export const InputStyled = styled.input`
  background: ${theme.white};
  border: solid 1px ${theme.greyish};
  border-radius: 3px;
  padding: 5px 10px;
  width: ${EDITOR_WIDTH}px;
  height: ${EDITOR_HEIGHT}px;
`;

// Basic IG username validator
const instagramMentionRegex = /^[a-zA-Z0-9_][a-zA-Z0-9_.]*$/;

export const validateInstagramMention = (mention) => {
  if (!mention || typeof mention !== 'string'){
    return false;
  }
  return instagramMentionRegex.test(mention.trim());
};

export default class TagOnImage extends Component {
  static propTypes = {
    addImageTag: PropTypes.func.isRequired,
    imageId: PropTypes.string.isRequired,
    postId: PropTypes.string.isRequired,
    removeImageTag: PropTypes.func.isRequired,
    tags: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired
    })).isRequired
  };

  static defaultProps = {
    tags: []
  };

  constructor(props){
    super(props);
    this.editorRef = React.createRef();
    this.state = {
      editor: null,
      transientTags: []
    };
  }

  componentDidMount(){
    document.addEventListener('keydown', this.onEscapePress, false);
  }

  componentWillUnmount(){
    document.removeEventListener('keydown', this.onEscapePress, false);
  }

  componentDidUpdate(prevProps){
    // Reset transient tags once updated tags were fetched
    if (prevProps.tags.length !== this.props.tags.length){
      this.setState({ transientTags: [] });
    }
  }

  onEscapePress = (e) => {
    if (e.keyCode === 27){
      // Hide the Editor if its visible
      if (this.state.editor){
        this.setState({ editor: null });
      }
    }
  }

  getPosition(x, y){
    const position = {};
    // Converting normalized coordinates to percent values
    const xPercent = x * 100;
    const yPercent = y * 100;

    // Prevents horizontal overflow
    if (x > 0.5){
      position.right = `${(100 - xPercent)}%`;
    } else {
      position.left = `${xPercent}%`;
    }

    // Prevents vertical overflow
    if (y > 0.5){
      position.bottom = `${(100 - yPercent)}%`;
    } else {
      position.top = `${yPercent}%`;
    }

    return position;
  }

  mountEditor = (e) => {
    const { offsetX, offsetY, srcElement: { offsetWidth, offsetHeight } } = e.nativeEvent;
    const x = offsetX / offsetWidth;
    const y = offsetY / offsetHeight;
    const value = path(['editor', 'value'], this.state);

    this.setState({
      editor: { x, y, value }
    }, () => {
      // Focus on the editor
      if (this.editorRef && this.editorRef.current){
        this.editorRef.current.focus();
      }
    });
  }

  onTagSave = () => {
    const { addImageTag, imageId, postId } = this.props;
    const { editor: { value, x, y } } = this.state;
    const tag = { id: value, x, y };
    if (!value){
      this.setState({
        editor: {
          ...this.state.editor,
          value: ''
        }
      });
      return;
    }
    this.setState({
      editor: null,
      transientTags: [{ ...tag, transient: true }]
    });
    addImageTag(postId, imageId, tag);
  }

  onTagRemove = (e, tag) => {
    const { removeImageTag, imageId, postId } = this.props;
    e.preventDefault();
    e.stopPropagation();

    removeImageTag(postId, imageId, tag.id);
  }

  onKeyPress = (event) => {
    if (event.key === 'Enter'){
      this.onTagSave();
    }
  }

  onChange = (e) => {
    const { value } = e.target;

    this.setState({
      editor: {
        ...this.state.editor,
        value
      }
    });
  }

  onTagClick = (e) => e.stopPropagation();

  renderTag = (tag) => {
    const tagInProgress = this.state.transientTags.length > 0;
    const { id, transient, x, y } = tag;
    const position = this.getPosition(x, y);
    return (
      <TagStyled style={position} onClick={this.onTagClick} transient={transient} key={id}>
        {id}
        <RemoveIconStyled type='FaClose' size='14' tagInProgress={tagInProgress} onClick={(e) => this.onTagRemove(e, tag)} />
      </TagStyled>
    );
  }

  renderTags(){
    // Render both persisted & transient tags
    const tags = this.props.tags.concat(this.state.transientTags);
    return (
      <TagsWrapperStyled onClick={this.mountEditor}>
        {tags.map(this.renderTag)}
      </TagsWrapperStyled>
    );
  }

  renderEditor(){
    const { editor, transientTags } = this.state;
    // Don't render the editor if there are tags in progress
    if (!editor || transientTags.length){
      return null;
    }

    const { x, y } = editor;
    const position = this.getPosition(x, y);

    return (
      <InputWrapperStyled style={position}>
        <InputStyled
          type='text'
          placeholder='Type username'
          onKeyPress={this.onKeyPress}
          onChange={this.onChange}
          ref={this.editorRef}
          value={editor.value}
        />
      </InputWrapperStyled>
    );
  }

  render(){
    return (
      <TagsWrapperStyled>
        {this.renderTags()}
        {this.renderEditor()}
      </TagsWrapperStyled>
    );
  }
}
