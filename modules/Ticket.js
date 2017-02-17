import React from 'react'
import AV from 'leancloud-storage'
import moment from 'moment'
import Promise from 'bluebird'
import _ from 'lodash'
import {TICKET_STATUS_OPEN, TICKET_STATUS_CLOSED} from '../lib/constant'

const common = require('./common')

export default React.createClass({
  reloadTicketAndReplies(nid) {
    return new AV.Query('Ticket')
    .equalTo('nid', parseInt(nid))
    .include('author')
    .first()
    .then((ticket) => {
      if (!ticket) {
        return
      }
      return Promise.all([
        new AV.Query('Reply')
          .equalTo('ticket', ticket)
          .include('author')
          .ascending('createdAt')
          .find(),
        new AV.Query('OpsLog')
          .equalTo('ticket', ticket)
          .ascending('createdAt')
          .find(),
      ]).spread((replies, opsLogs) => {
        this.setState({ticket, replies, opsLogs})
      })
    }).catch((err) => {
      alert(err.stack)
    })
  },
  getInitialState() {
    return {
      ticket: null,
      replies: [],
      opsLogs: [],
      reply: '',
    }
  },
  componentDidMount() {
    this.reloadTicketAndReplies(this.props.params.nid)
  },
  componentWillReceiveProps(nextProps) {
    this.reloadTicketAndReplies(nextProps.params.nid)
  },
  handleReplyOnChange(e) {
    this.setState({reply: e.target.value})
  },
  handleReplyCommit(e) {
    e.preventDefault()
    new AV.Object('Reply').save({
      ticket: this.state.ticket,
      content: this.state.reply,
    }).then((reply) => {
      return reply.fetch({
        include: 'author'
      })
    }).then((reply) => {
      this.setState({reply: ''})
      const replies = this.state.replies
      replies.push(reply)
      this.setState({replies})
    }).catch((err) => {
      alert(err.stack)
    })
  },
  handleTicketClose() {
    this.state.ticket.set('status', TICKET_STATUS_CLOSED).save()
    .then((ticket) => {
      this.setState({ticket})
      return Promise.delay(500)
    }).then(() => {
      return new AV.Query('OpsLog')
      .equalTo('ticket', this.state.ticket)
      .ascending('createdAt')
      .find()
    }).then((opsLogs) => {
      this.setState({opsLogs})
    })
  },
  handleTicketReopen() {
    this.state.ticket.set('status', TICKET_STATUS_OPEN).save()
    .then((ticket) => {
      this.setState({ticket})
      return Promise.delay(500)
    }).then(() => {
      return new AV.Query('OpsLog')
      .equalTo('ticket', this.state.ticket)
      .ascending('createdAt')
      .find()
    }).then((opsLogs) => {
      this.setState({opsLogs})
    })
  },
  ticketTimeline(data) {
    if (data.className === 'OpsLog') {
      switch (data.get('action')) {
      case 'selectAssignee':
        return (
          <p key={data.id}>
            系统 于 {moment(data.get('createdAt')).fromNow()} 将工单分配给 {common.userLabel(data.get('data').assignee)} 处理
          </p>
        )
      case 'changeStatus':
        return (
          <p key={data.id}>
            {common.userLabel(data.get('data').operator)} 于 {moment(data.get('createdAt')).fromNow()} 将工单状态修改为 {data.get('data').status === 0 ? '开启' : '关闭'}
          </p>
        )
      }
    } else {
      return (
        <div key={data.id} className="panel panel-default">
          <div className="panel-heading">
            {common.userLabel(data.get('author'))} 于 {moment(data.get('createdAt')).fromNow()}提交
          </div>
          <div className="panel-body">
            {data.get('content')}
          </div>
        </div>
      )
    }
  },
  render() {
    if (this.state.ticket === null) {
      return (
      <div>读取中……</div>
      )
    }
    const timeline = _.chain(this.state.replies)
    .concat(this.state.opsLogs)
    .sortBy((data) => {
      return data.get('createdAt')
    }).map(this.ticketTimeline)
    .value()
    let optionButtons, statusLabel
    if (this.state.ticket.get('status') == TICKET_STATUS_OPEN) {
      statusLabel = <span className="label label-success">Open</span>
      optionButtons = <button type="button" className='btn btn-default' onClick={this.handleTicketClose}>关闭</button>
    } else {
      statusLabel = <span className="label label-danger">Closed</span>
      optionButtons = <button type="button" className='btn btn-default' onClick={this.handleTicketReopen}>重新打开</button>
    }
    return (
      <div>
        <h2>{this.state.ticket.get('title')} <small>#{this.state.ticket.get('nid')}</small></h2>
        <div>
          {statusLabel} <span>{common.userLabel(this.state.ticket.get('author'))} 于 {moment(this.state.ticket.get('createdAt')).fromNow()}创建该工单</span>
        </div>
        <hr />
        {this.ticketTimeline(this.state.ticket)}
        <div>{timeline}</div>
        <hr />
        <div>
          <div className="form-group">
            <textarea className="form-control" rows="8" placeholder="回复内容……" value={this.state.reply} onChange={this.handleReplyOnChange}></textarea>
          </div>
          <button type="button" className='btn btn-primary' onClick={this.handleReplyCommit}>回复</button>
          {optionButtons}
        </div>
      </div>
    )
  }
})
