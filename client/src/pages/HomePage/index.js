import { connect } from 'react-redux';
import { clearFile } from '../../actions/publish';
import View from './view';

const mapStateToProps = props => ({ isUpdate: props.publish.isUpdate });

const mapDispatchToProps = {
  clearFile,
};

export default connect(mapStateToProps, mapDispatchToProps)(View);
