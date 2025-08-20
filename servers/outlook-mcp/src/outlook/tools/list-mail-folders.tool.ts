import { MailFolder } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const ListMailFoldersInputSchema = z.object({
  includeChildFolders: z.boolean().default(false).describe('Whether to include child folders'),
  limit: z.number().min(1).max(100).default(20).describe('Number of folders to retrieve'),
});

@Injectable()
export class ListMailFoldersTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'list_mail_folders',
    description: 'List mail folders from Outlook',
    parameters: ListMailFoldersInputSchema,
  })
  public async listMailFolders(
    { includeChildFolders, limit }: z.infer<typeof ListMailFoldersInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      const response = await graphClient
        .api('/me/mailFolders')
        .select('id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount')
        .top(limit)
        .get();

      let folders = response.value.map((folder: MailFolder) => ({
        id: folder.id,
        displayName: folder.displayName,
        parentFolderId: folder.parentFolderId,
        childFolderCount: folder.childFolderCount,
        unreadItemCount: folder.unreadItemCount,
        totalItemCount: folder.totalItemCount,
      }));

      if (includeChildFolders) {
        const foldersWithChildren = await Promise.all(
          folders.map(async (folder: MailFolder) => {
            if (folder.childFolderCount && folder.childFolderCount > 0) {
              try {
                const childResponse = await graphClient
                  .api(`/me/mailFolders/${folder.id}/childFolders`)
                  .select(
                    'id,displayName,parentFolderId,childFolderCount,unreadItemCount,totalItemCount',
                  )
                  .get();

                return {
                  ...folder,
                  childFolders: childResponse.value.map((childFolder: MailFolder) => ({
                    id: childFolder.id,
                    displayName: childFolder.displayName,
                    parentFolderId: childFolder.parentFolderId,
                    childFolderCount: childFolder.childFolderCount,
                    unreadItemCount: childFolder.unreadItemCount,
                    totalItemCount: childFolder.totalItemCount,
                  })),
                };
              } catch (error) {
                this.logger.warn({
                  msg: 'Failed to fetch child folders',
                  folderId: folder.id,
                  error: serializeError(normalizeError(error)),
                });
                return folder;
              }
            }
            return folder;
          }),
        );
        folders = foldersWithChildren;
      }

      return {
        folders,
        count: folders.length,
        includeChildFolders,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to list mail folders from Outlook',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
