import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const SearchEmailInputSchema = z.object({
  query: z.string().optional().describe('Text to search for in subject, body, or sender'),
  folderId: z
    .string()
    .optional()
    .describe('Specific folder ID to search in (searches all folders if not specified)'),
  from: z.string().optional().describe('Email address or name of sender to filter by'),
  subject: z.string().optional().describe('Text to search for in subject line only'),
  hasAttachments: z.boolean().optional().describe('Filter by messages with/without attachments'),
  isRead: z.boolean().optional().describe('Filter by read/unread status'),
  importance: z.enum(['low', 'normal', 'high']).optional().describe('Filter by importance level'),
  dateFrom: z
    .string()
    .optional()
    .describe('Start date for date range filter (ISO format: YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date for date range filter (ISO format: YYYY-MM-DD)'),
  limit: z.number().min(1).max(100).default(25).describe('Number of messages to retrieve'),
  orderBy: z
    .enum(['receivedDateTime', 'sentDateTime', 'subject', 'from', 'importance'])
    .default('receivedDateTime')
    .describe(
      'Field to order results by (only used when not searching - search results are ordered by relevance)',
    ),
  orderDirection: z
    .enum(['asc', 'desc'])
    .default('desc')
    .describe('Order direction (only used when not searching)'),
});

@Injectable()
export class SearchEmailTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'search_email',
    description:
      'Search for emails in Outlook using various criteria. When using text search (query parameter), results are automatically ordered by relevance. Custom ordering is only available when not using text search.',
    parameters: SearchEmailInputSchema,
  })
  public async searchEmail(
    {
      query,
      folderId,
      from,
      subject,
      hasAttachments,
      isRead,
      importance,
      dateFrom,
      dateTo,
      limit,
      orderBy,
      orderDirection,
    }: z.infer<typeof SearchEmailInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      const endpoint = folderId ? `/me/mailFolders/${folderId}/messages` : '/me/messages';

      const filterConditions: string[] = [];

      if (from)
        filterConditions.push(
          `from/emailAddress/address eq '${from}' or from/emailAddress/name eq '${from}'`,
        );
      if (subject) filterConditions.push(`contains(subject,'${subject}')`);
      if (hasAttachments !== undefined)
        filterConditions.push(`hasAttachments eq ${hasAttachments}`);
      if (isRead !== undefined) filterConditions.push(`isRead eq ${isRead}`);
      if (importance) filterConditions.push(`importance eq '${importance}'`);
      if (dateFrom) filterConditions.push(`receivedDateTime ge ${dateFrom}T00:00:00Z`);
      if (dateTo) filterConditions.push(`receivedDateTime le ${dateTo}T23:59:59Z`);

      let graphQuery = graphClient
        .api(endpoint)
        .select(
          'id,subject,from,receivedDateTime,sentDateTime,bodyPreview,importance,isRead,hasAttachments,internetMessageId,parentFolderId',
        )
        .top(limit);

      if (query) {
        graphQuery = graphQuery.search(`"${query}"`);
      } else {
        graphQuery = graphQuery.orderby(`${orderBy} ${orderDirection}`);
      }

      if (filterConditions.length > 0) {
        const filterString = filterConditions.join(' and ');
        graphQuery = graphQuery.filter(filterString);
      }

      const response = await graphQuery.get();

      const messages = response.value.map((message: Message) => ({
        id: message.id,
        subject: message.subject,
        from: {
          address: message.from?.emailAddress?.address,
          name: message.from?.emailAddress?.name,
        },
        receivedAt: message.receivedDateTime,
        sentAt: message.sentDateTime,
        preview: message.bodyPreview,
        importance: message.importance,
        isRead: message.isRead,
        hasAttachments: message.hasAttachments,
        internetMessageId: message.internetMessageId,
        parentFolderId: message.parentFolderId,
      }));

      let folderName = null;
      if (folderId) {
        try {
          const folder = await graphClient
            .api(`/me/mailFolders/${folderId}`)
            .select('displayName')
            .get();
          folderName = folder.displayName;
        } catch (folderError) {
          this.logger.debug({
            msg: 'Could not retrieve folder name for search results',
            folderId,
            error: serializeError(normalizeError(folderError)),
          });
        }
      }

      const searchCriteria = {
        query,
        folderId,
        folderName,
        from,
        subject,
        hasAttachments,
        isRead,
        importance,
        dateFrom,
        dateTo,
        orderBy,
        orderDirection,
      };

      this.logger.debug({
        msg: 'Email search completed',
        resultCount: messages.length,
        searchCriteria,
      });

      return {
        messages,
        count: messages.length,
        searchCriteria,
        message: `Found ${messages.length} email${messages.length !== 1 ? 's' : ''} matching your search criteria`,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to search emails in Outlook',
        query,
        folderId,
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
